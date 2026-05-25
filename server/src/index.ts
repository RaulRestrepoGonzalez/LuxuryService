import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { connectDb, getDb, ObjectId, toApiId, toApiList } from './db.js';
import { buildChatbotReply, HORARIOS, invalidateChatbotCache, initChatbotCache } from './chatbot.js';
import { notificarCitaAgendada, notificarBienvenidaCliente } from './notifications.js';
import { createCheckout, processWebhook } from './payments.js';
import { enviarTicketCita, enviarConfirmacionPago, enviarNotificacionGeneral, getEmailStatus, reenviarEmailsPendientes, ensureTransporter, verificarConfiguracion, iniciarColaPendientes, enviarCorreoPrueba } from './email.js';
import QRCode from 'qrcode';
import crypto, { createHash } from 'crypto';
import multer from 'multer';
import { parse as csvParse } from 'csv-parse/sync';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

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
  const token = header?.startsWith('Bearer ') ? header.split(' ')[1] : (req.query.token as string);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, JWT_SECRET) as JwtUser;
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

const PUBLIC_CACHE = 300;
const PUBLIC_CATALOG_CACHE = 600;

app.get('/api/health', (_req, res) => res.json({ ok: true, db: 'mongodb' }));

app.use('/api/services', (_req, res, next) => {
  res.set('Cache-Control', `public, max-age=${PUBLIC_CATALOG_CACHE}, s-maxage=${PUBLIC_CATALOG_CACHE}`);
  next();
});
app.use('/api/products', (_req, res, next) => {
  res.set('Cache-Control', `public, max-age=${PUBLIC_CATALOG_CACHE}, s-maxage=${PUBLIC_CATALOG_CACHE}`);
  next();
});
app.use('/api/appointments/available', (_req, res, next) => {
  res.set('Cache-Control', `public, max-age=${PUBLIC_CACHE}, s-maxage=${PUBLIC_CACHE}`);
  next();
});
app.use('/api/appointments/calendar', (_req, res, next) => {
  res.set('Cache-Control', `public, max-age=${PUBLIC_CACHE}, s-maxage=${PUBLIC_CACHE}`);
  next();
});

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
  try {
    const emailNorm = req.body.email?.trim().toLowerCase();
    if (!emailNorm) return res.status(400).json({ error: 'Email requerido' });
    if (emailNorm === ADMIN_EMAIL) return res.status(400).json({ error: 'Los administradores deben usar contraseña' });
    const user = await getDb().collection('usuarios').findOne({ email: emailNorm }, { projection: { _id: 1, email: 1, nombre: 1, rol: 1, acepta_terminos: 1, consentimiento_datos: 1 } });
    if (!user) return res.status(404).json({ error: 'Regístrate primero con tu correo' });
    if (!user.acepta_terminos || !user.consentimiento_datos) return res.status(403).json({ error: 'Aceptación de términos pendiente' });
    console.log(`[ACCESS] OK: ${emailNorm}`);
    res.json(issueToken({ _id: user._id, email: user.email, nombre: user.nombre, rol: user.rol }));
  } catch (err) {
    console.error('[ACCESS] Error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/auth/client-register', async (req, res) => {
  try {
    const { nombre, email, aceptaTerminos, consentimientoDatos, versionTerminos, versionPolitica } = req.body;
    const emailNorm = email?.trim().toLowerCase();
    if (!nombre?.trim() || !emailNorm) return res.status(400).json({ error: 'Nombre y correo requeridos' });
    if (!aceptaTerminos || !consentimientoDatos) return res.status(400).json({ error: 'Debe aceptar términos y autorizar datos' });
    if (versionTerminos !== TERMINOS_VERSION || versionPolitica !== POLITICA_VERSION) return res.status(400).json({ error: 'Versión de documentos desactualizada' });
    if (emailNorm === ADMIN_EMAIL) return res.status(400).json({ error: 'El correo del administrador no puede registrarse como cliente' });
    const exists = await getDb().collection('usuarios').findOne({ email: emailNorm });
    if (exists) return res.status(400).json({ error: 'El correo ya está registrado. Usa Acceder.' });

    const placeholderHash = createHash('sha256').update(emailNorm).digest('hex');
    const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'desconocida');
    const result = await getDb().collection('usuarios').insertOne({
      nombre: nombre.trim(), email: emailNorm, password_hash: placeholderHash, rol: 'cliente',
      passwordless: true, acepta_terminos: true, consentimiento_datos: true,
      notificaciones_activas: true, fecha_aceptacion_terminos: new Date(),
      version_terminos: TERMINOS_VERSION, version_politica: POLITICA_VERSION, ip_registro: ip, created_at: new Date()
    });
    const userId = String(result.insertedId);
    Promise.all([
      logConsent({ usuarioId: userId, email: emailNorm, tipo: 'registro_terminos', version: TERMINOS_VERSION, ip, userAgent: req.headers['user-agent'] }),
      logConsent({ usuarioId: userId, email: emailNorm, tipo: 'autorizacion_datos', version: POLITICA_VERSION, ip, userAgent: req.headers['user-agent'] }),
      notificarBienvenidaCliente(userId, emailNorm)
    ]).catch(e => console.error('Background tasks failed:', e));
    const user = { _id: result.insertedId, nombre: nombre.trim(), email: emailNorm, rol: 'cliente' };
    const token = issueToken(user);
    console.log(`[REGISTER] OK: ${emailNorm} -> ${String(result.insertedId)}`);
    res.json(token);
  } catch (err) {
    console.error('Error en client-register:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
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
  res.json(issueToken({ _id: user!._id, email: user!.email, nombre: user!.nombre, rol: user!.rol }));
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
  const docs = await getDb().collection('productos')
    .find({
      activo: { $ne: false },
      nombre: {
        $not: /\b(CAFE|CAFÉ|TINTO|CAPUCCINO|CAPUCHINO|COCOSET|COCOSETTE|ABUELITA|NESCAFE|LATTES|LATTE|CHOCOLATE|CERVEZA|GASEOSA|GATORADE|JUGO|GALLETA|CHIPS|CHEETOS|DORITOS|DETODITO|FRITOLAY|CHOKIS|MONSTER ENERGY|RED BULL|PALETA|PALETTA|PALETT)\b/i
      }
    })
    .toArray();
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

app.post('/api/gift-cards/purchase', auth, async (req, res) => {
  const { monto, etiqueta } = req.body;
  const montosValidos = [50000, 80000, 140000, 200000];
  if (!montosValidos.includes(monto)) return res.status(400).json({ error: 'Monto inválido' });

  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const descripcion = `Gift Card ${etiqueta || ''} - $${monto.toLocaleString('es-CO')} - Luxury Service`.trim();

  const checkout = await createCheckout({
    amount: monto,
    description: descripcion,
    returnUrl: `${baseUrl}/app/tarjeta-regalo?ok=true`,
    webhookUrl: `${baseUrl}/api/payments/webhook`,
    customerEmail: req.user!.email,
  });

  const checkoutUrl = checkout.checkoutUrl;
  const reference = checkout.reference;

  await getDb().collection('gift_cards').insertOne({
    usuario_id: new ObjectId(req.user!.id),
    comprador_email: req.user!.email,
    monto,
    etiqueta: etiqueta || '',
    estado: 'pendiente_pago',
    payment_reference: reference,
    created_at: new Date()
  });

  const pagoData: Record<string, any> = {
    usuario_id: new ObjectId(req.user!.id), email: req.user!.email,
    referencia: reference, monto,
    descripcion,
    estado: 'pendiente', checkout_url: checkoutUrl,
    tipo: 'gift_card',
    created_at: new Date()
  };
  await getDb().collection('pagos').insertOne(pagoData);

  const qrBase64 = await QRCode.toDataURL(checkoutUrl, { width: 300, margin: 2 });
  const qrClean = qrBase64.replace(/^data:image\/png;base64,/, '');
  await getDb().collection('pagos').updateOne(
    { referencia: reference },
    { $set: { qr_base64: qrClean } }
  );

  res.json({
    success: true, message: 'Compra de Gift Card iniciada. Realiza el pago para activarla.',
    payment: { url: checkoutUrl, reference, amount: monto, qr: qrBase64 }
  });
});

function isValidObjectId(id: string): boolean {
  try { new ObjectId(id); return true; } catch { return false; }
}

app.get('/api/appointments/available', async (req, res) => {
  const fecha = req.query.fecha as string;
  const servicioId = req.query.servicioId as string;
  if (!fecha || !servicioId || !isValidObjectId(servicioId)) return res.json(HORARIOS.map(h => ({ value: h, label: HORARIO_LABELS[h] || h })));
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
  if (!servicioId || !year || !month || !isValidObjectId(servicioId)) return res.json({ bookedDates: [] });
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
  const { servicioId, fecha, horario, tipoVehiculo = 'auto', productoId, productoNombre, productoPrecio = 0 } = req.body;
  if (!(HORARIOS as readonly string[]).includes(horario)) return res.status(400).json({ error: 'Horario inválido' });
  const existing = await getDb().collection('citas').findOne({ fecha, horario, servicio_id: new ObjectId(servicioId), estado: { $ne: 'cancelada' } });
  if (existing) return res.status(409).json({ error: 'Horario ocupado' });
  const servicio = await getDb().collection('servicios').findOne({ _id: new ObjectId(servicioId), activo: { $ne: false } });
  if (!servicio) return res.status(404).json({ error: 'Servicio no encontrado' });

  let producto: any = null;
  if (productoId) {
    producto = await getDb().collection('productos').findOne({ _id: new ObjectId(productoId) });
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
  }

  const precioBase = tipoVehiculo === 'camioneta'
    ? (servicio.precio_camioneta || servicio.precio_base || 0)
    : (servicio.precio_auto || servicio.precio_base || 0);
  const precioProducto = producto?.precio || Number(productoPrecio) || 0;
  const bookingFee = 10000;
  const precioTotal = precioBase + precioProducto + bookingFee;
  const productoNombreFinal = producto?.nombre || productoNombre || '';
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const descripcionPago = productoNombreFinal
    ? `${servicio.nombre} + ${productoNombreFinal} - Luxury Service`
    : `${servicio.nombre} - Luxury Service`;

  const checkout = await createCheckout({
    amount: precioTotal,
    description: descripcionPago,
    returnUrl: `${baseUrl}/app/mis-citas`,
    webhookUrl: `${baseUrl}/api/payments/webhook`,
    customerEmail: req.user!.email,
  });

  const checkoutUrl = checkout.checkoutUrl;
  const reference = checkout.reference;

  const citaData: Record<string, any> = {
    usuario_id: new ObjectId(req.user!.id), servicio_id: new ObjectId(servicioId),
    fecha, horario, tipoVehiculo, estado: 'pendiente_pago', precio_base: precioBase,
    booking_fee: bookingFee, precio_total: precioTotal,
    payment_reference: checkout.reference, created_at: new Date()
  };
  if (producto) {
    citaData.producto_id = new ObjectId(producto._id);
    citaData.producto_nombre = producto.nombre;
    citaData.producto_precio = producto.precio;
  }

  await getDb().collection('citas').insertOne(citaData);

  const pagoData: Record<string, any> = {
    usuario_id: new ObjectId(req.user!.id), email: req.user!.email,
    referencia: checkout.reference, monto: precioTotal,
    servicio_nombre: `${servicio.nombre}${productoNombreFinal ? ' + ' + productoNombreFinal : ''}`,
    fecha, horario,
    estado: 'pendiente', checkout_url: checkout.checkoutUrl,
    created_at: new Date()
  };
  if (producto) {
    pagoData.producto_id = new ObjectId(producto._id);
    pagoData.producto_nombre = producto.nombre;
  }

  await getDb().collection('pagos').insertOne(pagoData);

  const qrBase64 = await QRCode.toDataURL(checkoutUrl, { width: 300, margin: 2 });

  // Store QR in pagos for later email after payment
  const qrClean = qrBase64.replace(/^data:image\/png;base64,/, '');
  await getDb().collection('pagos').updateOne(
    { referencia: checkout.reference },
    { $set: { qr_base64: qrClean } }
  );

  res.json({
    success: true, message: 'Cita agendada. Realiza el pago para confirmar.',
    payment: { url: checkoutUrl, reference, amount: precioTotal, qr: qrBase64 }
  });

  // In-app notification only (NO email ticket until payment confirmed)
  notificarCitaAgendada(req.user!.id, req.user!.email, servicio.nombre, fecha, horario, reference).catch(e => console.error('Error notificando:', e.message));
});

app.post('/api/payments/webhook', async (req, res) => {
  const { valid, payload } = processWebhook(req.body);
  if (!valid || !payload) return res.status(400).json({ error: 'Invalid webhook' });

  if (payload.status === 'APPROVED') {
    const tipoPago = await getDb().collection('pagos').findOne({ referencia: payload.reference });

    if (tipoPago?.tipo === 'gift_card') {
      const codigo = `GC-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      await getDb().collection('gift_cards').updateOne(
        { payment_reference: payload.reference },
        { $set: { estado: 'activa', codigo, activada_at: new Date(), payment_transaction: payload.transactionId } }
      );
      await getDb().collection('pagos').updateOne(
        { referencia: payload.reference },
        { $set: { estado: 'pagado', transaction_id: payload.transactionId, pagado_at: new Date() } }
      );
      const gc = await getDb().collection('gift_cards').findOne({ payment_reference: payload.reference });
      if (gc) {
        try {
          const checkoutUrl = tipoPago?.checkout_url || '';
          const qrData = tipoPago?.qr_base64 || '';
          const qrFinal = qrData || (checkoutUrl
            ? (await QRCode.toDataURL(checkoutUrl, { width: 300, margin: 2 })).replace(/^data:image\/png;base64,/, '')
            : '');
          const qrEmail = qrFinal
            ? `<div style="text-align:center;margin:1.5rem 0">
                 <img src="cid:qr" alt="QR de pago" style="width:200px;height:200px" />
               </div>`
            : '';
          await enviarNotificacionGeneral({
            to: gc.comprador_email,
            nombre: gc.comprador_email.split('@')[0],
            asunto: '🎁 Tu Gift Card Luxury Service está activa',
            titulo: '🎁 Gift Card Activada',
            mensaje: '',
            htmlCustom: `
              <h2 style="margin:0 0 1rem;font-size:1.2rem;color:#0a0a0a;">🎁 Gift Card Activada</h2>
              <p style="color:#555;line-height:1.6;">Hola <strong>${gc.comprador_email.split('@')[0]}</strong>,</p>
              <p style="color:#555;line-height:1.6;">Tu Gift Card <strong>${gc.etiqueta || ''}</strong> por <strong>$${gc.monto.toLocaleString('es-CO')}</strong> ya está activa y lista para usar.</p>
              <div style="background:#f5f5f5;padding:1.5rem;text-align:center;border-radius:8px;margin:1.5rem 0">
                <p style="margin:0 0 0.5rem;font-size:0.85rem;color:#666">Código de regalo:</p>
                <p style="margin:0;font-size:1.5rem;font-weight:900;letter-spacing:0.1em;color:#0a0a0a">${codigo}</p>
              </div>
              <p style="color:#555;font-size:0.9rem">Comparte este código con la persona que recibirá el regalo. Puede canjearlo en nuestro local presentándolo.</p>
              ${qrEmail}
              <hr style="border:none;border-top:1px solid #eee;margin:2rem 0">
              <p style="color:#888;font-size:0.75rem">Luxury Service — Cra. 19 #28-43, Local 3</p>
            `,
            qrBase64: qrFinal || undefined,
          });
        } catch (err: any) {
          console.error('Error enviando email gift card:', err.message);
        }
      }
    } else {
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
        const cita = await getDb().collection('citas').findOne({ payment_reference: payload.reference });
        try {
          const qrData = pago.qr_base64 || '';
          const productoNombre = pago.producto_nombre || '';
          const servicioConProducto = productoNombre
            ? `${pago.servicio_nombre} + ${productoNombre}`
            : pago.servicio_nombre;
          const checkoutUrl = pago.checkout_url || '';
          const qrFinal = qrData || (checkoutUrl
            ? (await QRCode.toDataURL(checkoutUrl, { width: 300, margin: 2 })).replace(/^data:image\/png;base64,/, '')
            : '');
          await enviarTicketCita({
            to: pago.email, nombre: pago.email.split('@')[0],
            servicio: servicioConProducto, fecha: pago.fecha,
            horario: pago.horario, precioTotal: pago.monto,
            reference: payload.reference,
            checkoutUrl: checkoutUrl,
            qrBase64: qrFinal,
            producto: productoNombre,
          });
        } catch (err: any) {
          console.error('Error enviando ticket post-pago:', err.message);
        }
      }
    }
  } else if (payload.status === 'DECLINED') {
    await getDb().collection('pagos').updateOne(
      { referencia: payload.reference },
      { $set: { estado: 'rechazado' } }
    );
    await getDb().collection('gift_cards').updateOne(
      { payment_reference: payload.reference },
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

const analyticsCache = { data: null as any, loadedAt: 0 };
app.get('/api/admin/dashboard/analytics', auth, adminRequired, async (_req, res) => {
  if (analyticsCache.data && Date.now() - analyticsCache.loadedAt < 60000) return res.json(analyticsCache.data);
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
  analyticsCache.data = { revenueTrend, appointmentsByStatus, clientsTrend, servicesBooked, totalClients, totalAppointments, totalServices };
  analyticsCache.loadedAt = Date.now();
  res.json(analyticsCache.data);
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

  const esc = (s: unknown) => String(s ?? '').replace(/"/g, '""');
  const mType = (v: unknown) => {
    if (v === null || v === undefined) return 'null';
    if (typeof v === 'number') return Number.isInteger(v) ? 'Int64.Type' : 'number';
    if (typeof v === 'boolean') return 'Logical.Type';
    return 'text';
  };

  const buildTableM = (name: string, rows: Record<string, unknown>[], cols: string[]) => {
    if (rows.length === 0) return `#table(${JSON.stringify(cols)}, {})`;
    const types = cols.map(c => `${c} = ${mType(rows[0][c])}`).join(', ');
    const data = rows.map(r => `    {${cols.map(c => {
      const v = r[c];
      if (v === null || v === undefined) return 'null';
      if (typeof v === 'number') return String(v);
      return `"${esc(v)}"`;
    }).join(', ')}}`);
    return `let\n  Source = #table(type table [${types}], {\n${data.join(',\n')}\n  })\nin\n  Source`;
  };

  const tCols = ['fecha', 'tipo', 'monto', 'descripcion'];
  const cCols = ['fecha', 'horario', 'estado', 'cliente', 'email', 'servicio', 'precio'];
  const uCols = ['id', 'nombre', 'email', 'rol', 'registro'];
  const pCols = ['id', 'nombre', 'categoria', 'precio', 'stock'];
  const sCols = ['id', 'nombre', 'categoria', 'precio_auto', 'precio_camioneta', 'duracion'];

  const tables = [
    { name: 'Transacciones', data: transacciones.map(t => ({ fecha: t.fecha, tipo: t.tipo, monto: t.monto, descripcion: t.descripcion })), cols: tCols },
    { name: 'Citas', data: citas.map(c => ({ fecha: c.fecha, horario: c.horario, estado: c.estado, cliente: c.cliente_nombre, email: c.cliente_email, servicio: c.servicio_nombre, precio: c.servicio_precio })), cols: cCols },
    { name: 'Usuarios', data: usuarios.map(u => ({ id: u._id, nombre: u.nombre, email: u.email, rol: u.rol, registro: u.created_at })), cols: uCols },
    { name: 'Productos', data: productos.map(p => ({ id: p._id, nombre: p.nombre, categoria: p.categoria, precio: p.precio, stock: p.stock })), cols: pCols },
    { name: 'Servicios', data: servicios.map(s => ({ id: s._id, nombre: s.nombre, categoria: s.categoria, precio_auto: s.precio_auto, precio_camioneta: s.precio_camioneta, duracion: s.duracion_minutos })), cols: sCols },
  ];

  const tomTables = tables.map(t => {
    const m = buildTableM(t.name, t.data, t.cols);
    return {
      name: t.name,
      columns: t.cols.map(c => ({
        name: c,
        dataType: (() => {
          if (t.data.length === 0) return 'string';
          const v = t.data[0][c as keyof typeof t.data[0]];
          if (v === null || v === undefined) return 'string';
          if (typeof v === 'number') return Number.isInteger(v) ? 'int64' : 'double';
          if (typeof v === 'boolean') return 'boolean';
          return 'string';
        })(),
        sourceColumn: c
      })),
      partitions: [{ name: 'Partition', source: { type: 'm', expression: m } }]
    };
  });

  const model = {
    name: 'LuxuryService',
    culture: 'en-US',
    compatibilityLevel: 1566,
    model: { tables: tomTables, relationships: [], cultures: [] },
    pbixDependencies: { version: 1, dependencies: [] }
  };

  const { gzip } = await import('zlib');
  const { promisify } = await import('util');
  const gzipAsync = promisify(gzip);

  const modelJson = JSON.stringify(model, null, 2);
  const dataModelBuf = await gzipAsync(Buffer.from(modelJson, 'utf-8'), { level: 9 });

  const { ZipArchive: Za } = await import('archiver') as any;
  const archive = new Za({ zlib: { level: 6 } });

  res.setHeader('Content-Type', 'application/vnd.ms-powerbi');
  res.setHeader('Content-Disposition', 'attachment; filename=LuxuryService.pbix');
  archive.pipe(res);

  archive.append(`<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="json" ContentType="application/json" />
  <Default Extension="xml" ContentType="application/xml" />
  <Override PartName="/DataModel" ContentType="application/x-msmediawiki" />
</Types>`, { name: '[Content_Types].xml' });

  archive.append(JSON.stringify({ version: '2.164', pbiVersion: '2.132.1942.0' }), { name: 'Settings/settings.json' });
  archive.append(JSON.stringify({ version: '2.164' }), { name: 'Version/version.json' });
  archive.append(JSON.stringify([]), { name: 'Connections/Connections.json' });
  archive.append(JSON.stringify({ sections: [] }), { name: 'Report/Report.json' });
  archive.append('', { name: 'SecurityBindings/SecurityBindings' });
  archive.append(dataModelBuf, { name: 'DataModel' });

  await archive.finalize();
});

app.get('/api/admin/dashboard/export', auth, adminRequired, async (_req, res) => {
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

  const ArchiverMod = (await import('archiver')) as any;
  const archive = new ArchiverMod.ZipArchive({ zlib: { level: 6 } });
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename=luxury_datos.zip');
  archive.pipe(res);

  const csvEscape = (v: unknown) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  let buf = '\uFEFFfecha,tipo,monto,descripcion\n';
  for (const r of transacciones) buf += `${csvEscape(r.fecha)},${csvEscape(r.tipo)},${csvEscape(r.monto)},${csvEscape(r.descripcion)}\n`;
  archive.append(buf, { name: 'transacciones.csv' });

  buf = '\uFEFFfecha,horario,estado,cliente_nombre,cliente_email,servicio_nombre,servicio_precio\n';
  for (const r of citas) buf += `${csvEscape(r.fecha)},${csvEscape(r.horario)},${csvEscape(r.estado)},${csvEscape(r.cliente_nombre)},${csvEscape(r.cliente_email)},${csvEscape(r.servicio_nombre)},${csvEscape(r.servicio_precio)}\n`;
  archive.append(buf, { name: 'citas.csv' });

  buf = '\uFEFFid,nombre,email,rol,created_at\n';
  for (const r of usuarios) buf += `${csvEscape(r._id)},${csvEscape(r.nombre)},${csvEscape(r.email)},${csvEscape(r.rol)},${csvEscape(r.created_at)}\n`;
  archive.append(buf, { name: 'usuarios.csv' });

  buf = '\uFEFFid,nombre,categoria,precio,stock\n';
  for (const r of productos) buf += `${csvEscape(r._id)},${csvEscape(r.nombre)},${csvEscape(r.categoria)},${csvEscape(r.precio)},${csvEscape(r.stock)}\n`;
  archive.append(buf, { name: 'productos.csv' });

  buf = '\uFEFFid,nombre,categoria,precio_auto,precio_camioneta,duracion_minutos\n';
  for (const r of servicios) buf += `${csvEscape(r._id)},${csvEscape(r.nombre)},${csvEscape(r.categoria)},${csvEscape(r.precio_auto)},${csvEscape(r.precio_camioneta)},${csvEscape(r.duracion_minutos)}\n`;
  archive.append(buf, { name: 'servicios.csv' });

  await archive.finalize();
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

app.post('/api/admin/import', auth, adminRequired, upload.single('archivo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Debes subir un archivo' });
  const tipo = String(req.body.tipo || 'productos');
  const ext = req.file.originalname.toLowerCase().endsWith('.csv') ? 'csv' : 'xlsx';

  let rows: Record<string, string>[] = [];

  if (ext === 'csv') {
    const raw = (req.file.buffer as any).toString('utf-8').replace(/^\uFEFF/, '');
    const records = csvParse(raw, { columns: true, skip_empty_lines: true, relax_column_count: true, trim: true });
    rows = records as Record<string, string>[];
  } else {
    const ExcelJS = (await import('exceljs')).default;
    const wb = await new ExcelJS.Workbook().xlsx.load(req.file.buffer as any);
    const ws = wb.worksheets[0];
    if (!ws) return res.status(400).json({ error: 'El archivo Excel no tiene hojas' });
    const headers: string[] = [];
    ws.getRow(1).eachCell(c => headers.push(String(c.text).trim()));
    ws.eachRow((row, rowIndex) => {
      if (rowIndex === 1) return;
      const obj: Record<string, string> = {};
      row.eachCell((cell, colIndex) => { obj[headers[colIndex - 1]] = String(cell.text).trim(); });
      rows.push(obj);
    });
  }

  if (rows.length === 0) return res.status(400).json({ error: 'El archivo está vacío o no tiene datos' });

  const db = getDb();

  if (tipo === 'combinado') {
    let actualizadosServ = 0;
    let actualizadosProd = 0;
    let insertadosServ = 0;
    let insertadosProd = 0;
    const errores: string[] = [];
    const sinCambiosServ = new Set<string>();
    const sinCambiosProd = new Set<string>();

    const normalize = (s: string) =>
      s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '').trim();

    const fuzzyMatch = (name: string, candidates: any[]): any | null => {
      const norm = normalize(name);
      const words = norm.split(/\s+/).filter(Boolean);
      for (const c of candidates) {
        const cNorm = normalize(c.nombre);
        if (cNorm === norm) return c;
        const cWords = cNorm.split(/\s+/).filter(Boolean);
        const overlap = words.filter(w => cWords.includes(w)).length;
        if (overlap >= Math.min(words.length, cWords.length) * 0.4) return c;
      }
      return null;
    };

    // Load all existing services and products once
    const allServicios = await db.collection('servicios').find({ activo: { $ne: false } }).toArray();
    const allProductos = await db.collection('productos').find({ activo: { $ne: false } }).toArray();

    const excelServNombres = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const nro = i + 2;
      const producto = (row.PRODUCTO || row.producto || '').trim();
      if (!producto) { errores.push(`Fila ${nro}: falta PRODUCTO`); continue; }

      const tipoItem = (row.TIPO || row.tipo || '').trim();

      if (tipoItem === 'SERV') excelServNombres.add(normalize(producto));

      const valorVenta = Number(String(row.VALOR_VENTA || row.valor_venta || '0').replace(/[^0-9.]/g, '')) || 0;
      const existencia = Number(String(row.EXISTENCIA || row.existencia || '0').replace(/[^0-9.]/g, '')) || 0;

      try {
        if (tipoItem === 'SERV') {
          const match = fuzzyMatch(producto, allServicios);
          if (match) {
            const setFields: Record<string, any> = {};
            let changed = false;
            if (match.precio_auto !== valorVenta) {
              setFields.precio_auto = valorVenta;
              setFields.precio_base = valorVenta;
              changed = true;
            }
            const nuevoCamioneta = Math.round(valorVenta * 1.15);
            if (match.precio_camioneta !== nuevoCamioneta) {
              setFields.precio_camioneta = nuevoCamioneta;
              changed = true;
            }
            const nuevoMoto = Math.round(valorVenta * 0.9);
            if (match.precio_moto == null || match.precio_moto <= 0 || match.precio_moto !== nuevoMoto) {
              // Only set moto price if it already exists and has changed, or if it's the first time
              if (match.precio_moto != null && match.precio_moto > 0 && match.precio_moto !== nuevoMoto) {
                setFields.precio_moto = nuevoMoto;
                changed = true;
              }
            }
            if (match.nombre !== producto) {
              setFields.nombre = producto;
              changed = true;
            }

            if (changed) {
              await db.collection('servicios').updateOne({ _id: match._id }, { $set: setFields });
              actualizadosServ++;
            } else {
              sinCambiosServ.add(producto);
            }
          } else {
            errores.push(`Fila ${nro} (SERV): "${producto}" no encontrado en BD`);
          }
        } else if (tipoItem === 'PROD') {
          const match = fuzzyMatch(producto, allProductos);
          if (match) {
            const setFields: Record<string, any> = {};
            let changed = false;
            if (match.precio !== valorVenta) {
              setFields.precio = valorVenta;
              changed = true;
            }
            if (match.stock !== existencia) {
              setFields.stock = existencia;
              changed = true;
            }
            if (match.nombre !== producto) {
              setFields.nombre = producto;
              changed = true;
            }

            if (changed) {
              await db.collection('productos').updateOne({ _id: match._id }, { $set: setFields });
              actualizadosProd++;
            } else {
              sinCambiosProd.add(producto);
            }
          } else {
            errores.push(`Fila ${nro} (PROD): "${producto}" no encontrado en BD`);
          }
        } else {
          errores.push(`Fila ${nro}: TIPO "${tipoItem}" no válido (use PROD o SERV)`);
        }
      } catch (e: any) {
        errores.push(`Fila ${nro}: ${e.message}`);
      }
    }

    // Mark services that are no longer in the Excel file as inactive
    let desactivados = 0;
    for (const s of allServicios) {
      const sNorm = normalize(s.nombre);
      if (!excelServNombres.has(sNorm)) {
        await db.collection('servicios').updateOne({ _id: s._id }, { $set: { activo: false } });
        desactivados++;
      }
    }

    res.json({
      success: true,
      servicios_actualizados: actualizadosServ,
      productos_actualizados: actualizadosProd,
      servicios_desactivados: desactivados,
      sin_cambios_servicios: [...sinCambiosServ],
      sin_cambios_productos: [...sinCambiosProd],
      errores: errores.length > 0 ? errores : undefined
    });

  } else {
    const collection = tipo === 'servicios' ? 'servicios' : 'productos';
    let insertados = 0;
    let actualizados = 0;
    const errores: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const nro = i + 2;

      if (!row.nombre?.trim()) { errores.push(`Fila ${nro}: falta el nombre`); continue; }

      try {
        const nombre = row.nombre.trim();
        const exists = await db.collection(collection).findOne({ nombre });

        if (tipo === 'servicios') {
          const doc = {
            nombre,
            descripcion: row.descripcion?.trim() || '',
            categoria: row.categoria?.trim() || 'General',
            subcategoria: row.subcategoria?.trim() || null,
            items: row.items?.trim() ? row.items.split(',').map((s: string) => s.trim()) : [],
            precio_auto: Number(row.precio_auto) || 0,
            precio_camioneta: Number(row.precio_camioneta) || Number(row.precio_auto) || 0,
            precio_base: Number(row.precio_auto) || 0,
            iva_incluido: true,
            duracion_minutos: Number(row.duracion_minutos) || 60,
            agendable: true,
            icono: row.icono?.trim() || 'auto_awesome',
            imagen_url: row.imagen_url?.trim() || '',
            color: row.color?.trim() || '#ff2b2b',
            orden: Number(row.orden) || 99,
            activo: true,
            created_at: new Date()
          };
          if (exists) {
            await db.collection(collection).updateOne({ _id: exists._id }, { $set: doc });
            actualizados++;
          } else {
            await db.collection(collection).insertOne(doc);
            insertados++;
          }
        } else {
          const doc = {
            nombre,
            descripcion: row.descripcion?.trim() || '',
            categoria: row.categoria?.trim() || 'General',
            precio: Number(row.precio) || 0,
            stock: Number(row.stock) || 0,
            icono: row.icono?.trim() || 'inventory_2',
            color: row.color?.trim() || '#4285F4',
            activo: true,
            created_at: new Date()
          };
          if (exists) {
            await db.collection(collection).updateOne({ _id: exists._id }, { $set: doc });
            actualizados++;
          } else {
            await db.collection(collection).insertOne(doc);
            insertados++;
          }
        }
      } catch (e: any) {
        errores.push(`Fila ${nro}: ${e.message}`);
      }
    }

    res.json({ success: true, insertados, actualizados, errores: errores.length > 0 ? errores : undefined });
  }
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
  const reply = await buildChatbotReply(String(req.body.message || ''), req.body.vehiculo);
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

app.get('/api/admin/email-status', auth, adminRequired, async (_req, res) => {
  res.json(getEmailStatus());
});

app.get('/api/admin/pending-emails', auth, adminRequired, async (_req, res) => {
  const emails = await getDb().collection('pending_emails').find().sort({ createdAt: -1 }).limit(50).toArray();
  res.json(toApiList(emails as Record<string, unknown>[]));
});

app.post('/api/admin/retry-emails', auth, adminRequired, async (_req, res) => {
  const result = await reenviarEmailsPendientes();
  res.json(result);
});

app.post('/api/admin/test-email', auth, adminRequired, async (_req, res) => {
  try {
    const sent = await enviarCorreoPrueba(ADMIN_EMAIL);
    if (sent) {
      res.json({ success: true, message: `Email de prueba enviado a ${ADMIN_EMAIL}. Revisa tu bandeja de entrada o SPAM.` });
    } else {
      res.json({ success: true, message: `Email de prueba encolado como pendiente. Se reintentará automáticamente. Destino: ${ADMIN_EMAIL}` });
    }
  } catch (err: any) {
    const status = getEmailStatus();
    res.status(500).json({ error: 'Error enviando email de prueba: ' + err.message, status });
  }
});

connectDb().then(async () => {
  const db = getDb();
  await db.collection('usuarios').createIndex({ email: 1 }, { unique: true, background: true });
  await db.collection('citas').createIndex({ fecha: 1, servicio_id: 1 });
  await db.collection('notificaciones').createIndex({ usuario_id: 1, created_at: -1 });
  await db.collection('pending_emails').createIndex({ createdAt: 1 });
  await db.collection('pending_emails').createIndex({ intentos: 1, proximoIntento: 1 });
  await db.collection('transacciones').createIndex({ tipo: 1, created_at: -1 });
  await db.collection('citas').createIndex({ usuario_id: 1, created_at: -1 });
  await db.collection('citas').createIndex({ usuario_id: 1, fecha: -1 });
  await db.collection('transacciones').createIndex({ referencia: 1 });
  await db.collection('gift_cards').createIndex({ payment_reference: 1 });
  await db.collection('gift_cards').createIndex({ codigo: 1 }, { unique: true, sparse: true });
  await db.collection('gift_cards').createIndex({ usuario_id: 1 });
  await initChatbotCache();
  await verificarConfiguracion();
  iniciarColaPendientes();

  app.listen(PORT, () => {
    console.log(`API MongoDB → http://localhost:${PORT}/api`);
    console.log(`Compass: mongodb://127.0.0.1:27017 → luxury_service`);
  });
}).catch(err => {
  console.error('No se pudo conectar a MongoDB:', err.message);
  console.error('Asegúrate de tener MongoDB corriendo (Compass o mongod)');
  process.exit(1);
});
