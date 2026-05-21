import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { connectDb, getDb, ObjectId, toApiId, toApiList } from './db.js';
import { buildChatbotReply, HORARIOS, invalidateChatbotCache } from './chatbot.js';
import { notificarCitaAgendada, notificarBienvenidaCliente } from './notifications.js';
import { createCheckout, processWebhook } from './payments.js';
import { enviarTicketCita, enviarConfirmacionPago } from './email.js';
import QRCode from 'qrcode';
import { randomBytes } from 'crypto';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-luxury-secret';
const TERMINOS_VERSION = '1.0.0-2026';
const POLITICA_VERSION = '1.0.0-2026';
const ADMIN_EMAIL = 'admin@luxuryservice.co';
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+\-=[\]{}|;:,.<>~`])[A-Za-z\d@$!%*?&#^()_+\-=[\]{}|;:,.<>~`]{8,}$/;
const HORARIO_LABELS: Record<string, string> = { '10:00': '10:00 a.m.', '14:00': '2:00 p.m.' };

interface JwtUser { id: string; email: string; rol: string; }

app.use(cors());
app.use(express.json());

function validatePassword(password: string): string | null {
  if (!password || password.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
  if (!PASSWORD_REGEX.test(password)) return 'Debe incluir mayúsculas, minúsculas, números y un carácter especial';
  return null;
}

async function logConsent(data: { usuarioId?: string; email: string; tipo: string; version: string; ip?: string; userAgent?: string }) {
  await getDb().collection('consentimientos_auditoria').insertOne({
    usuario_id: data.usuarioId ? new ObjectId(data.usuarioId) : null,
    email: data.email,
    tipo: data.tipo,
    version_documento: data.version,
    ip_origen: data.ip ?? null,
    user_agent: data.userAgent ?? null,
    created_at: new Date()
  });
}

function auth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(header.split(' ')[1], JWT_SECRET) as JwtUser;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function adminRequired(req: Request, res: Response, next: NextFunction) {
  if (req.user?.rol !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  next();
}

declare global {
  namespace Express {
    interface Request { user?: JwtUser; }
  }
}

app.get('/api/health', (_req, res) => res.json({ ok: true, db: 'mongodb' }));

app.get('/api/auth/check-email', async (req, res) => {
  const email = String(req.query.email || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Email inválido' });
  const isAdmin = email === ADMIN_EMAIL;
  const user = await getDb().collection('usuarios').findOne({ email });
  res.json({
    exists: !!user,
    nombre: user?.nombre ?? null,
    rol: isAdmin ? 'admin' : user?.rol ?? null,
    isAdmin,
    requiresPassword: isAdmin
  });
});

function issueToken(user: { _id: unknown; email: string; nombre: string; rol: string }) {
  const userId = String(user._id);
  const token = jwt.sign({ id: userId, email: user.email, rol: user.rol }, JWT_SECRET, { expiresIn: '30d' });
  return { token, user: { id: userId, nombre: user.nombre, email: user.email, rol: user.rol } };
}

app.post('/api/auth/client-access', async (req, res) => {
  const emailNorm = req.body.email?.trim().toLowerCase();
  if (!emailNorm) return res.status(400).json({ error: 'Email requerido' });
  const user = await getDb().collection('usuarios').findOne({ email: emailNorm });
  if (!user) return res.status(404).json({ error: 'Regístrate primero con tu correo' });
  if (emailNorm === ADMIN_EMAIL) return res.status(400).json({ error: 'Los administradores deben usar contraseña' });
  if (!user.acepta_terminos || !user.consentimiento_datos) return res.status(403).json({ error: 'Aceptación de términos pendiente' });
  res.json(issueToken(user));
});

app.post('/api/auth/client-register', async (req, res) => {
  const { nombre, email, aceptaTerminos, consentimientoDatos, versionTerminos, versionPolitica } = req.body;
  const emailNorm = email?.trim().toLowerCase();
  if (!nombre?.trim() || !emailNorm) return res.status(400).json({ error: 'Nombre y correo requeridos' });
  if (!aceptaTerminos || !consentimientoDatos) return res.status(400).json({ error: 'Debe aceptar términos y autorizar datos' });
  if (versionTerminos !== TERMINOS_VERSION || versionPolitica !== POLITICA_VERSION) return res.status(400).json({ error: 'Versión de documentos desactualizada' });
  if (emailNorm === ADMIN_EMAIL) return res.status(400).json({ error: 'El correo del administrador no puede registrarse como cliente' });
  const exists = await getDb().collection('usuarios').findOne({ email: emailNorm });
  if (exists) return res.status(400).json({ error: 'El correo ya está registrado. Usa Acceder.' });

  const placeholderHash = await bcrypt.hash(randomBytes(32).toString('hex'), 10);
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'desconocida');
  const result = await getDb().collection('usuarios').insertOne({
    nombre: nombre.trim(), email: emailNorm, password_hash: placeholderHash, rol: 'cliente',
    passwordless: true, acepta_terminos: true, consentimiento_datos: true,
    notificaciones_activas: true, fecha_aceptacion_terminos: new Date(),
    version_terminos: TERMINOS_VERSION, version_politica: POLITICA_VERSION, ip_registro: ip, created_at: new Date()
  });
  const userId = String(result.insertedId);
  await logConsent({ usuarioId: userId, email: emailNorm, tipo: 'registro_terminos', version: TERMINOS_VERSION, ip, userAgent: req.headers['user-agent'] });
  await logConsent({ usuarioId: userId, email: emailNorm, tipo: 'autorizacion_datos', version: POLITICA_VERSION, ip, userAgent: req.headers['user-agent'] });
  await notificarBienvenidaCliente(userId, emailNorm);
  const user = { _id: result.insertedId, nombre: nombre.trim(), email: emailNorm, rol: 'cliente' };
  res.json(issueToken(user));
});

app.post('/api/auth/register', async (req, res) => {
  const { nombre, email, password, aceptaTerminos, consentimientoDatos, versionTerminos, versionPolitica } = req.body;
  const emailNorm = email?.trim().toLowerCase();
  if (!nombre?.trim() || !emailNorm || !password) return res.status(400).json({ error: 'Datos incompletos' });
  if (!aceptaTerminos || !consentimientoDatos) return res.status(400).json({ error: 'Debe aceptar términos y autorizar el tratamiento de datos' });
  if (versionTerminos !== TERMINOS_VERSION || versionPolitica !== POLITICA_VERSION) return res.status(400).json({ error: 'Versión de documentos desactualizada' });
  const pwdError = validatePassword(password);
  if (pwdError) return res.status(400).json({ error: pwdError });
  if (emailNorm === ADMIN_EMAIL) return res.status(400).json({ error: 'El correo del administrador no puede registrarse como cliente' });
  const exists = await getDb().collection('usuarios').findOne({ email: emailNorm });
  if (exists) return res.status(400).json({ error: 'El correo ya está registrado' });

  const hashed = await bcrypt.hash(password, 10);
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'desconocida');
  const result = await getDb().collection('usuarios').insertOne({
    nombre: nombre.trim(), email: emailNorm, password_hash: hashed, rol: 'cliente',
    acepta_terminos: true, consentimiento_datos: true, fecha_aceptacion_terminos: new Date(),
    version_terminos: TERMINOS_VERSION, version_politica: POLITICA_VERSION, ip_registro: ip, created_at: new Date()
  });
  const userId = String(result.insertedId);
  await logConsent({ usuarioId: userId, email: emailNorm, tipo: 'registro_terminos', version: TERMINOS_VERSION, ip, userAgent: req.headers['user-agent'] });
  await logConsent({ usuarioId: userId, email: emailNorm, tipo: 'autorizacion_datos', version: POLITICA_VERSION, ip, userAgent: req.headers['user-agent'] });

  const user = { id: userId, nombre: nombre.trim(), email: emailNorm, rol: 'cliente' };
  const token = jwt.sign({ id: userId, email: emailNorm, rol: 'cliente' }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const emailNorm = email?.trim().toLowerCase();
  if (emailNorm !== ADMIN_EMAIL) return res.status(401).json({ error: 'Acceso solo para administradores con contraseña' });
  let user = await getDb().collection('usuarios').findOne({ email: emailNorm });
  if (!user) {
    const adminHash = await bcrypt.hash('Admin123!', 10);
    const result = await getDb().collection('usuarios').insertOne({
      nombre: 'Administrador', email: ADMIN_EMAIL, rol: 'admin',
      password_hash: adminHash, acepta_terminos: true, consentimiento_datos: true,
      fecha_aceptacion_terminos: new Date(), version_terminos: TERMINOS_VERSION,
      version_politica: POLITICA_VERSION, ip_registro: 'auto', created_at: new Date()
    });
    user = await getDb().collection('usuarios').findOne({ _id: result.insertedId });
  }
  if (!(await bcrypt.compare(password, user!.password_hash))) return res.status(401).json({ error: 'Credenciales incorrectas' });
  res.json(issueToken(user!));
});

app.get('/api/notifications', auth, async (req, res) => {
  const docs = await getDb().collection('notificaciones')
    .find({ usuario_id: new ObjectId(req.user!.id) })
    .sort({ created_at: -1 })
    .limit(30)
    .toArray();
  res.json(toApiList(docs as Record<string, unknown>[]));
});

app.put('/api/notifications/:id/read', auth, async (req, res) => {
  await getDb().collection('notificaciones').updateOne(
    { _id: new ObjectId(req.params.id), usuario_id: new ObjectId(req.user!.id) },
    { $set: { leida: true } }
  );
  res.json({ success: true });
});

app.post('/api/auth/revoke-consent', auth, async (req, res) => {
  await getDb().collection('usuarios').updateOne({ _id: new ObjectId(req.user!.id) }, { $set: { consentimiento_datos: false } });
  await logConsent({ usuarioId: req.user!.id, email: req.user!.email, tipo: 'revocacion_datos', version: POLITICA_VERSION });
  res.json({ success: true, message: 'Autorización revocada conforme a la Ley 1581.' });
});

app.get('/api/services', async (_req, res) => {
  const docs = await getDb().collection('servicios').find({ activo: true }).sort({ orden: 1 }).toArray();
  res.json(toApiList(docs as Record<string, unknown>[]));
});

app.get('/api/services/catalog', async (_req, res) => {
  const docs = await getDb().collection('servicios').find({ activo: true }).sort({ orden: 1 }).toArray();
  const list = toApiList(docs as Record<string, unknown>[]);
  const grouped: Record<string, unknown[]> = {};
  for (const s of list) {
    const cat = (s.categoria as string) || 'Otros';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(s);
  }
  res.json({ categorias: Object.keys(grouped), grouped });
});

app.get('/api/products', async (_req, res) => {
  const docs = await getDb().collection('productos').find({ activo: { $ne: false } }).toArray();
  res.json(toApiList(docs as Record<string, unknown>[]));
});

app.post('/api/purchase', auth, async (req, res) => {
  const { productoId, cantidad = 1 } = req.body;
  const producto = await getDb().collection('productos').findOne({ _id: new ObjectId(productoId) });
  if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
  if (producto.stock < cantidad) return res.status(400).json({ error: 'Stock insuficiente' });
  const montoTotal = producto.precio * cantidad;
  await getDb().collection('ventas').insertOne({ producto_id: producto._id, usuario_id: new ObjectId(req.user!.id), cantidad, monto_total: montoTotal, fecha: new Date(), created_at: new Date() });
  await getDb().collection('productos').updateOne({ _id: producto._id }, { $inc: { stock: -cantidad } });
  await getDb().collection('transacciones').insertOne({ tipo: 'ingreso', monto: montoTotal, descripcion: `Venta de ${producto.nombre}`, referencia_id: producto._id, fecha: new Date(), created_at: new Date() });
  res.json({ success: true });
});

app.get('/api/appointments/available', async (req, res) => {
  const fecha = req.query.fecha as string;
  const servicioId = req.query.servicioId as string;
  if (!fecha || !servicioId) return res.json([]);
  const ocupados = await getDb().collection('citas').find({
    fecha, servicio_id: new ObjectId(servicioId), estado: { $ne: 'cancelada' }
  }).toArray();
  const set = new Set(ocupados.map(c => c.horario));
  const slots = HORARIOS.filter(h => !set.has(h)).map(h => ({ value: h, label: HORARIO_LABELS[h] || h }));
  res.json(slots);
});

app.get('/api/appointments/calendar', async (req, res) => {
  const servicioId = req.query.servicioId as string;
  const year = Number(req.query.year);
  const month = Number(req.query.month);
  if (!servicioId || !year || !month) return res.json({ bookedDates: [] });
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  const citas = await getDb().collection('citas').find({
    servicio_id: new ObjectId(servicioId),
    fecha: { $regex: `^${prefix}` },
    estado: { $ne: 'cancelada' }
  }).toArray();
  const byDate: Record<string, string[]> = {};
  for (const c of citas) {
    if (!byDate[c.fecha]) byDate[c.fecha] = [];
    byDate[c.fecha].push(c.horario);
  }
  const fullyBooked = Object.entries(byDate).filter(([, h]) => h.length >= HORARIOS.length).map(([d]) => d);
  res.json({ bookedDates: fullyBooked, horarios: HORARIOS.map(h => ({ value: h, label: HORARIO_LABELS[h] })) });
});

app.post('/api/appointments', auth, async (req, res) => {
  const { servicioId, fecha, horario, tipoVehiculo = 'auto' } = req.body;
  if (!(HORARIOS as readonly string[]).includes(horario)) return res.status(400).json({ error: 'Horario inválido' });
  const existing = await getDb().collection('citas').findOne({ fecha, horario, servicio_id: new ObjectId(servicioId), estado: { $ne: 'cancelada' } });
  if (existing) return res.status(409).json({ error: 'Horario ocupado' });
  const servicio = await getDb().collection('servicios').findOne({ _id: new ObjectId(servicioId) });
  if (!servicio) return res.status(404).json({ error: 'Servicio no encontrado' });

  const precioBase = tipoVehiculo === 'camioneta'
    ? (servicio.precio_camioneta || servicio.precio_base || 0)
    : (servicio.precio_auto || servicio.precio_base || 0);
  const bookingFee = 10000;
  const precioTotal = precioBase + bookingFee;
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  const checkout = await createCheckout({
    amount: precioTotal,
    description: `${servicio.nombre} - Luxury Service`,
    returnUrl: `${baseUrl}/app/mis-citas`,
    webhookUrl: `${baseUrl}/api/payments/webhook`,
    customerEmail: req.user!.email,
  });

  await getDb().collection('citas').insertOne({
    usuario_id: new ObjectId(req.user!.id), servicio_id: new ObjectId(servicioId),
    fecha, horario, tipoVehiculo, estado: 'pendiente_pago', precio_base: precioBase,
    booking_fee: bookingFee, precio_total: precioTotal,
    payment_reference: checkout.reference, created_at: new Date()
  });

  await getDb().collection('pagos').insertOne({
    usuario_id: new ObjectId(req.user!.id), email: req.user!.email,
    referencia: checkout.reference, monto: precioTotal,
    servicio_nombre: servicio.nombre, fecha, horario,
    estado: 'pendiente', checkout_url: checkout.checkoutUrl,
    created_at: new Date()
  });

  const qrBase64 = await QRCode.toDataURL(checkout.checkoutUrl, { width: 300, margin: 2 });

  await notificarCitaAgendada(req.user!.id, req.user!.email, servicio.nombre, fecha, horario, checkout.reference);

  try {
    await enviarTicketCita({
      to: req.user!.email, nombre: req.user!.email.split('@')[0],
      servicio: servicio.nombre, fecha, horario,
      precioTotal, reference: checkout.reference,
      checkoutUrl: checkout.checkoutUrl, qrBase64: qrBase64.replace(/^data:image\/png;base64,/, ''),
    });
  } catch (err: any) {
    console.error('Error enviando email:', err.message);
  }

  res.json({
    success: true, message: 'Cita agendada. Realiza el pago para confirmar.',
    payment: { url: checkout.checkoutUrl, reference: checkout.reference, amount: precioTotal, qr: qrBase64 }
  });
});

app.post('/api/payments/webhook', async (req, res) => {
  const { valid, payload } = processWebhook(req.body);
  if (!valid || !payload) return res.status(400).json({ error: 'Invalid webhook' });

  if (payload.status === 'APPROVED') {
    await getDb().collection('citas').updateOne(
      { payment_reference: payload.reference },
      { $set: { estado: 'confirmada', payment_status: 'pagado', payment_transaction: payload.transactionId } }
    );
    await getDb().collection('pagos').updateOne(
      { referencia: payload.reference },
      { $set: { estado: 'pagado', transaction_id: payload.transactionId, pagado_at: new Date() } }
    );
    const pago = await getDb().collection('pagos').findOne({ referencia: payload.reference });
    if (pago) {
      try {
        await enviarConfirmacionPago({
          to: pago.email, nombre: pago.email.split('@')[0],
          servicio: pago.servicio_nombre, fecha: pago.fecha,
          horario: pago.horario, reference: payload.reference,
        });
      } catch (err: any) {
        console.error('Error enviando confirmación:', err.message);
      }
    }
  } else if (payload.status === 'DECLINED') {
    await getDb().collection('pagos').updateOne(
      { referencia: payload.reference },
      { $set: { estado: 'rechazado' } }
    );
  }

  res.json({ received: true });
});

app.get('/api/payments/qr', async (req, res) => {
  const url = req.query.url as string;
  if (!url) return res.status(400).json({ error: 'url requerida' });
  const qr = await QRCode.toBuffer(url, { width: 400, margin: 2 });
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(qr);
});

app.get('/api/appointments/my', auth, async (req, res) => {
  const citas = await getDb().collection('citas').aggregate([
    { $match: { usuario_id: new ObjectId(req.user!.id) } },
    { $lookup: { from: 'servicios', localField: 'servicio_id', foreignField: '_id', as: 'servicio' } },
    { $unwind: '$servicio' },
    { $sort: { fecha: -1 } },
    { $project: { fecha: 1, horario: 1, estado: 1, servicio_nombre: '$servicio.nombre', servicio_id: 1, usuario_id: 1, created_at: 1 } }
  ]).toArray();
  res.json(toApiList(citas as Record<string, unknown>[]));
});

app.put('/api/appointments/:id/cancel', auth, async (req, res) => {
  const cita = await getDb().collection('citas').findOne({ _id: new ObjectId(req.params.id) });
  if (!cita || String(cita.usuario_id) !== req.user!.id) return res.status(404).json({ error: 'Not found' });
  await getDb().collection('citas').updateOne({ _id: cita._id }, { $set: { estado: 'cancelada' } });
  res.json({ success: true });
});

app.get('/api/admin/appointments', auth, adminRequired, async (_req, res) => {
  const citas = await getDb().collection('citas').aggregate([
    { $lookup: { from: 'usuarios', localField: 'usuario_id', foreignField: '_id', as: 'usuario' } },
    { $lookup: { from: 'servicios', localField: 'servicio_id', foreignField: '_id', as: 'servicio' } },
    { $unwind: '$usuario' }, { $unwind: '$servicio' },
    { $sort: { fecha: -1 } },
    { $project: { fecha: 1, horario: 1, estado: 1, cliente_nombre: '$usuario.nombre', servicio_nombre: '$servicio.nombre' } }
  ]).toArray();
  res.json(toApiList(citas as Record<string, unknown>[]));
});

app.put('/api/admin/appointments/:id/status', auth, adminRequired, async (req, res) => {
  await getDb().collection('citas').updateOne({ _id: new ObjectId(req.params.id) }, { $set: { estado: req.body.estado } });
  res.json({ success: true });
});

app.get('/api/admin/dashboard/analytics', auth, adminRequired, async (_req, res) => {
  const db = getDb();
  const revenueTrend = await db.collection('transacciones').aggregate([
    { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$created_at' } }, ingresos: { $sum: { $cond: [{ $eq: ['$tipo', 'ingreso'] }, '$monto', 0] } }, egresos: { $sum: { $cond: [{ $eq: ['$tipo', 'egreso'] }, '$monto', 0] } } } },
    { $sort: { _id: 1 } }
  ]).toArray();
  const appointmentsByStatus = await db.collection('citas').aggregate([
    { $group: { _id: '$estado', count: { $sum: 1 } } }
  ]).toArray();
  const clientsTrend = await db.collection('usuarios').aggregate([
    { $match: { rol: 'cliente' } },
    { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$created_at' } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]).toArray();
  const servicesBooked = await db.collection('citas').aggregate([
    { $lookup: { from: 'servicios', localField: 'servicio_id', foreignField: '_id', as: 'servicio' } },
    { $unwind: { path: '$servicio', preserveNullAndEmptyArrays: true } },
    { $group: { _id: { $ifNull: ['$servicio.nombre', 'Desconocido'] }, count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();
  const totalClients = await db.collection('usuarios').countDocuments({ rol: 'cliente' });
  const totalAppointments = await db.collection('citas').countDocuments();
  const totalServices = await db.collection('servicios').countDocuments({ activo: true });
  res.json({ revenueTrend, appointmentsByStatus, clientsTrend, servicesBooked, totalClients, totalAppointments, totalServices });
});

app.get('/api/admin/dashboard/stats', auth, adminRequired, async (_req, res) => {
  const ingresos = await getDb().collection('transacciones').aggregate([{ $match: { tipo: 'ingreso' } }, { $group: { _id: null, total: { $sum: '$monto' } } }]).toArray();
  const egresos = await getDb().collection('transacciones').aggregate([{ $match: { tipo: 'egreso' } }, { $group: { _id: null, total: { $sum: '$monto' } } }]).toArray();
  res.json({ ingresos: ingresos[0]?.total || 0, egresos: egresos[0]?.total || 0 });
});

app.get('/api/admin/dashboard/product-sales', auth, adminRequired, async (_req, res) => {
  const productos = await getDb().collection('productos').find().toArray();
  const ventas = await getDb().collection('ventas').find().toArray();
  const stats = productos.map(p => {
    const pv = ventas.filter(v => String(v.producto_id) === String(p._id));
    return { id: String(p._id), nombre: p.nombre, categoria: p.categoria, stock: p.stock, ventas: pv.length, ingresos: pv.reduce((s, v) => s + v.monto_total, 0) };
  }).sort((a, b) => b.ventas - a.ventas);
  res.json({ productStats: stats, topProducts: stats.slice(0, 3), bottomProducts: stats.slice(-3).reverse() });
});

app.get('/api/admin/dashboard/powerbi', auth, adminRequired, async (_req, res) => {
  const db = getDb();
  const transacciones = await db.collection('transacciones').find().sort({ fecha: 1 }).toArray();
  const citas = await db.collection('citas').aggregate([
    { $lookup: { from: 'usuarios', localField: 'usuario_id', foreignField: '_id', as: 'usuario' } },
    { $lookup: { from: 'servicios', localField: 'servicio_id', foreignField: '_id', as: 'servicio' } },
    { $unwind: { path: '$usuario', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$servicio', preserveNullAndEmptyArrays: true } },
    { $project: { fecha: 1, horario: 1, estado: 1, created_at: 1, cliente_nombre: '$usuario.nombre', cliente_email: '$usuario.email', servicio_nombre: '$servicio.nombre', servicio_precio: '$servicio.precio_auto' } }
  ]).toArray();
  const usuarios = await db.collection('usuarios').find().sort({ created_at: 1 }).toArray();
  const productos = await db.collection('productos').find().sort({ nombre: 1 }).toArray();
  const servicios = await db.collection('servicios').find().sort({ nombre: 1 }).toArray();
  res.json({ transacciones: toApiList(transacciones.map((t: Record<string, unknown>) => ({ fecha: t.fecha, tipo: t.tipo, monto: t.monto, descripcion: t.descripcion, created_at: t.created_at }))), citas: toApiList(citas as Record<string, unknown>[]), usuarios: toApiList(usuarios.map((u: Record<string, unknown>) => ({ id: u._id, nombre: u.nombre, email: u.email, rol: u.rol, created_at: u.created_at }))), productos: toApiList(productos.map((p: Record<string, unknown>) => ({ id: p._id, nombre: p.nombre, categoria: p.categoria, precio: p.precio, stock: p.stock }))), servicios: toApiList(servicios.map((s: Record<string, unknown>) => ({ id: s._id, nombre: s.nombre, categoria: s.categoria, precio_auto: s.precio_auto, precio_camioneta: s.precio_camioneta, duracion_minutos: s.duracion_minutos }))) });
});

app.get('/api/admin/dashboard/export', auth, adminRequired, async (_req, res) => {
  const rows = await getDb().collection('transacciones').find().sort({ fecha: 1 }).toArray();
  let csv = 'fecha,tipo,monto,descripcion\n';
  for (const row of rows) csv += `${row.fecha},${row.tipo},${row.monto},${row.descripcion}\n`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=reporte.csv');
  res.send(csv);
});

/* ——— Admin: productos CRUD ——— */

app.get('/api/admin/products', auth, adminRequired, async (_req, res) => {
  const docs = await getDb().collection('productos').find().toArray();
  res.json(toApiList(docs as Record<string, unknown>[]));
});

app.post('/api/admin/products', auth, adminRequired, async (req, res) => {
  const { nombre, descripcion, precio, stock, categoria } = req.body;
  await getDb().collection('productos').insertOne({ nombre, descripcion, precio, stock, categoria, icono: 'inventory_2', color: '#4285F4', activo: true, created_at: new Date() });
  res.json({ success: true });
});

app.put('/api/admin/products/:id', auth, adminRequired, async (req, res) => {
  const set: Record<string, unknown> = {};
  for (const k of ['nombre', 'descripcion', 'precio', 'stock', 'categoria', 'activo']) {
    if (req.body[k] !== undefined) set[k] = req.body[k];
  }
  await getDb().collection('productos').updateOne({ _id: new ObjectId(req.params.id) }, { $set: set });
  res.json({ success: true });
});

app.delete('/api/admin/products/:id', auth, adminRequired, async (req, res) => {
  await getDb().collection('productos').deleteOne({ _id: new ObjectId(req.params.id) });
  res.json({ success: true });
});

/* ——— Admin: servicios CRUD ——— */

app.get('/api/admin/services', auth, adminRequired, async (_req, res) => {
  const docs = await getDb().collection('servicios').find().sort({ orden: 1 }).toArray();
  res.json(toApiList(docs as Record<string, unknown>[]));
});

app.post('/api/admin/services', auth, adminRequired, async (req, res) => {
  const { nombre, descripcion, categoria, subcategoria, items, precio_auto, precio_camioneta, duracion_minutos, agendable, icono, imagen_url, orden } = req.body;
  await getDb().collection('servicios').insertOne({
    nombre, descripcion, categoria, subcategoria: subcategoria || null, items: items || [],
    precio_base: precio_auto, precio_auto, precio_camioneta,
    iva_incluido: true, duracion_minutos, agendable: agendable ?? true,
    icono: icono || 'auto_awesome', imagen_url: imagen_url || '', color: '#ff2b2b',
    orden: orden || 99, activo: true, created_at: new Date()
  });
  res.json({ success: true });
});

app.put('/api/admin/services/:id', auth, adminRequired, async (req, res) => {
  const set: Record<string, unknown> = {};
  for (const k of ['nombre', 'descripcion', 'categoria', 'subcategoria', 'items', 'precio_auto', 'precio_camioneta', 'duracion_minutos', 'agendable', 'icono', 'imagen_url', 'orden', 'activo']) {
    if (req.body[k] !== undefined) set[k] = req.body[k];
  }
  if (req.body.precio_auto !== undefined) set['precio_base'] = req.body.precio_auto;
  await getDb().collection('servicios').updateOne({ _id: new ObjectId(req.params.id) }, { $set: set });
  res.json({ success: true });
});

app.delete('/api/admin/services/:id', auth, adminRequired, async (req, res) => {
  await getDb().collection('servicios').deleteOne({ _id: new ObjectId(req.params.id) });
  res.json({ success: true });
});

app.post('/api/contact', async (req, res) => {
  const { nombre, telefono, email, mensaje } = req.body;
  if (!nombre?.trim() || !telefono?.trim() || !email?.trim()) return res.status(400).json({ error: 'Nombre, teléfono y correo son requeridos' });
  await getDb().collection('contactos').insertOne({
    nombre: nombre.trim(),
    telefono: telefono.trim(),
    email: email.trim().toLowerCase(),
    mensaje: mensaje?.trim() || '',
    created_at: new Date()
  });
  res.json({ success: true });
});

app.post('/api/chatbot', async (req, res) => {
  const reply = await buildChatbotReply(String(req.body.message || ''));
  res.json({ reply });
});

app.post('/api/admin/promotions', auth, adminRequired, async (req, res) => {
  const { titulo, mensaje } = req.body;
  const clientes = await getDb().collection('usuarios').find({ rol: 'cliente', notificaciones_activas: { $ne: false } }).toArray();
  for (const c of clientes) {
    await getDb().collection('notificaciones').insertOne({
      usuario_id: c._id, email: c.email, tipo: 'promocion', titulo, mensaje, leida: false, created_at: new Date()
    });
  }
  invalidateChatbotCache();
  res.json({ success: true, enviadas: clientes.length });
});

connectDb().then(() => {
  app.listen(PORT, () => {
    console.log(`API MongoDB → http://localhost:${PORT}/api`);
    console.log(`Compass: mongodb://127.0.0.1:27017 → luxury_service`);
  });
}).catch(err => {
  console.error('No se pudo conectar a MongoDB:', err.message);
  console.error('Asegúrate de tener MongoDB corriendo (Compass o mongod)');
  process.exit(1);
});
