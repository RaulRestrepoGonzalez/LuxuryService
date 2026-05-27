import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { sign, verify } from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import { initMongo, findOne, find, insertOne, updateOne, deleteOne, aggregate } from './mongodb.js';
import { isFoodProduct } from './food-filter.js';

type Bindings = {
  DATA_API_URL: string;
  DATA_API_KEY: string;
  DATA_SOURCE: string;
  JWT_SECRET: string;
  ADMIN_EMAIL?: string;
  CREDIBANCO_MERCHANT_ID?: string;
  CREDIBANCO_API_KEY?: string;
  CREDIBANCO_API_URL?: string;
  CREDIBANCO_WEBHOOK_SECRET?: string;
  RESEND_API_KEY?: string;
  BASE_URL?: string;
};

const app = new Hono<{ Bindings: Bindings }>();
app.use('/*', cors());

app.use('*', async (c, next) => {
  initMongo({ url: c.env.DATA_API_URL, apiKey: c.env.DATA_API_KEY, dataSource: c.env.DATA_SOURCE, database: 'luxury_service' });
  await next();
});

// ── Auth middleware ──
async function auth(c: any, next: any) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401);
  try {
    const payload = verify(authHeader.split(' ')[1], c.env.JWT_SECRET);
    c.set('user', payload);
    await next();
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }
}
function adminRequired(c: any, next: any) {
  const user = c.get('user') as any;
  if (user.rol !== 'admin') return c.json({ error: 'Forbidden' }, 403);
  return next();
}

const ADMIN_EMAIL = 'luxury_admon@outlook.com';
const TERMINOS_VERSION = '1.0.0-2026';
const POLITICA_VERSION = '1.0.0-2026';

// ── Helpers ──
async function toApiList(docs: any[]) {
  return docs.map((d: any) => ({ id: d._id, ...d }));
}
function formatCOP(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
}
function generateRef(): string {
  return `LS-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

// ─────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────

app.get('/api/auth/check-email', async (c) => {
  const email = c.req.query('email')?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return c.json({ error: 'Email inválido' }, 400);
  const isAdmin = email === ADMIN_EMAIL;
  const result = await findOne('usuarios', { email });
  const user = result?.document;
  return c.json({ exists: !!user, nombre: user?.nombre || null, rol: isAdmin ? 'admin' : user?.rol || null, isAdmin, requiresPassword: isAdmin });
});

app.post('/api/auth/register', async (c) => {
  const body = await c.req.json();
  const { nombre, email, password, aceptaTerminos, consentimientoDatos, versionTerminos, versionPolitica } = body;
  const emailNorm = email?.trim().toLowerCase();
  if (!nombre?.trim() || !emailNorm || !password) return c.json({ error: 'Datos incompletos' }, 400);
  if (emailNorm === ADMIN_EMAIL) return c.json({ error: 'El correo del administrador no puede registrarse como cliente' }, 400);
  if (!aceptaTerminos || !consentimientoDatos) return c.json({ error: 'Debe aceptar términos y autorizar el tratamiento de datos (Ley 1581 de 2012)' }, 400);
  if (versionTerminos !== TERMINOS_VERSION || versionPolitica !== POLITICA_VERSION) return c.json({ error: 'Versión de documentos desactualizada. Recargue la página.' }, 400);

  const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+\-=[\]{}|;:,.<>~`])[A-Za-z\d@$!%*?&#^()_+\-=[\]{}|;:,.<>~`]{8,}$/;
  if (!PASSWORD_REGEX.test(password)) return c.json({ error: 'Debe incluir mayúsculas, minúsculas, números y un carácter especial (ISO 27001 A.9.4.3)' }, 400);

  const hashed = await bcrypt.hash(password, 10);
  const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'desconocida';

  try {
    const ins = await insertOne('usuarios', {
      nombre: nombre.trim(), email: emailNorm, password_hash: hashed, rol: 'cliente',
      acepta_terminos: 1, consentimiento_datos: 1,
      fecha_aceptacion_terminos: new Date().toISOString(),
      version_terminos: TERMINOS_VERSION, version_politica: POLITICA_VERSION,
      ip_registro: ip, created_at: new Date().toISOString(),
    });
    const userId = ins.insertedId;
    const token = sign({ id: userId, email: emailNorm, rol: 'cliente' }, c.env.JWT_SECRET, { expiresIn: '7d' });
    return c.json({ token, user: { id: userId, nombre: nombre.trim(), email: emailNorm, rol: 'cliente' } });
  } catch {
    return c.json({ error: 'El correo ya está registrado' }, 400);
  }
});

app.post('/api/auth/login', async (c) => {
  const { email, password } = await c.req.json();
  const emailNorm = email?.trim().toLowerCase();
  if (emailNorm !== ADMIN_EMAIL) return c.json({ error: 'Acceso solo para administradores con contraseña' }, 401);
  let result = await findOne('usuarios', { email: emailNorm });
  let user = result?.document;
  if (!user) {
    const adminHash = await bcrypt.hash('Admin123!', 10);
    const ins = await insertOne('usuarios', {
      nombre: 'Administrador', email: emailNorm, password_hash: adminHash, rol: 'admin',
      acepta_terminos: 1, consentimiento_datos: 1,
      fecha_aceptacion_terminos: new Date().toISOString(),
      version_terminos: TERMINOS_VERSION, version_politica: POLITICA_VERSION,
      ip_registro: 'auto', created_at: new Date().toISOString(),
    });
    result = await findOne('usuarios', { _id: ins.insertedId });
    user = result?.document;
  }
  if (!(await bcrypt.compare(password, user.password_hash))) return c.json({ error: 'Credenciales incorrectas' }, 401);
  const token = sign({ id: user._id, email: user.email, rol: user.rol }, c.env.JWT_SECRET, { expiresIn: '7d' });
  return c.json({ token, user: { id: user._id, nombre: user.nombre, email: user.email, rol: user.rol } });
});

app.post('/api/auth/revoke-consent', auth, async (c) => {
  const user = c.get('user') as any;
  await updateOne('usuarios', { _id: user.id }, { $set: { consentimiento_datos: 0 } });
  return c.json({ success: true, message: 'Autorización revocada. Sus datos serán eliminados conforme a la Ley 1581 en el plazo legal.' });
});

// ─────────────────────────────────────────────
// SERVICES - Public
// ─────────────────────────────────────────────

app.get('/api/services', async (c) => {
  const result = await find('servicios', { activo: { $ne: false } });
  return c.json(await toApiList(result?.documents || []));
});

app.get('/api/services/catalog', async (c) => {
  const result = await find('servicios', { activo: { $ne: false } }, { sort: { orden: 1 } });
  const servicios = result?.documents || [];
  const cats = [...new Set(servicios.map((s: any) => s.categoria).filter(Boolean))];
  const grouped: Record<string, any[]> = {};
  for (const s of servicios) {
    const cat = s.categoria || 'General';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push({ id: s._id, ...s });
  }
  return c.json({ categorias: cats, grouped });
});

// ─────────────────────────────────────────────
// PRODUCTS - Public
// ─────────────────────────────────────────────

app.get('/api/products', async (c) => {
  const result = await find('productos', { activo: { $ne: false } });
  return c.json(await toApiList(result?.documents || []));
});

app.post('/api/purchase', auth, async (c) => {
  const user = c.get('user') as any;
  const { productoId, cantidad = 1 } = await c.req.json();
  const result = await findOne('productos', { _id: productoId });
  const producto = result?.document;
  if (!producto) return c.json({ error: 'Producto no encontrado' }, 404);
  if (producto.stock < cantidad) return c.json({ error: 'Stock insuficiente' }, 400);
  const montoTotal = Number(producto.precio) * cantidad;
  await updateOne('productos', { _id: productoId }, { $inc: { stock: -cantidad } });
  await insertOne('ventas', { producto_id: productoId, usuario_id: user.id, cantidad, monto_total: montoTotal, fecha: new Date().toISOString().slice(0, 10), created_at: new Date().toISOString() });
  await insertOne('transacciones', { tipo: 'ingreso', monto: montoTotal, descripcion: `Venta de ${producto.nombre}`, fecha: new Date().toISOString().slice(0, 10), created_at: new Date().toISOString() });
  return c.json({ success: true });
});

// ─────────────────────────────────────────────
// APPOINTMENTS
// ─────────────────────────────────────────────

const HORARIOS = ['10:00', '14:00'];

app.get('/api/appointments/available', async (c) => {
  const fecha = c.req.query('fecha');
  const servicioId = c.req.query('servicioId');
  if (!fecha || !servicioId) return c.json([]);
  const result = await find('citas', { fecha, servicio_id: servicioId, estado: { $nin: ['cancelada', 'expirada'] } });
  const ocupados = new Set((result?.documents || []).map((r: any) => r.horario));
  return c.json(HORARIOS.filter(h => !ocupados.has(h)));
});

app.post('/api/appointments', auth, async (c) => {
  const user = c.get('user') as any;
  const { servicioId, fecha, horario, tipoVehiculo = 'auto' } = await c.req.json();
  if (!HORARIOS.includes(horario)) return c.json({ error: 'Horario inválido' }, 400);
  const existing = await findOne('citas', { fecha, horario, servicio_id: servicioId, estado: { $nin: ['cancelada', 'expirada'] } });
  if (existing?.document) return c.json({ error: 'Horario ocupado' }, 409);
  const ins = await insertOne('citas', {
    usuario_id: user.id, servicio_id: servicioId, fecha, horario, tipo_vehiculo: tipoVehiculo,
    estado: 'pendiente', created_at: new Date().toISOString(),
  });
  return c.json({ success: true, id: ins.insertedId });
});

app.get('/api/appointments/my', auth, async (c) => {
  const user = c.get('user') as any;
  const result = await find('citas', { usuario_id: user.id }, { sort: { fecha: -1 } });
  return c.json(await toApiList(result?.documents || []));
});

app.put('/api/appointments/:id/cancel', auth, async (c) => {
  const user = c.get('user') as any;
  const result = await findOne('citas', { _id: c.req.param('id') });
  if (!result?.document || result.document.usuario_id !== user.id) return c.json({ error: 'Not found' }, 404);
  await updateOne('citas', { _id: c.req.param('id') }, { $set: { estado: 'cancelada' } });
  return c.json({ success: true });
});

// ─────────────────────────────────────────────
// GIFT CARDS
// ─────────────────────────────────────────────

app.post('/api/gift-cards/purchase', auth, async (c) => {
  const user = c.get('user') as any;
  const { amount } = await c.req.json();
  const amt = Number(amount);
  if (![50000, 80000, 140000, 200000].includes(amt)) return c.json({ error: 'Valor inválido. Opciones: 50k, 80k, 140k, 200k' }, 400);
  const amtMap: Record<number, string> = { 50000: 'A', 80000: 'B', 140000: 'C', 200000: 'D' };
  const prefix = amtMap[amt];
  const code = prefix + generateRef().slice(2, 7).toUpperCase() + prefix;
  const reference = generateRef();
  await insertOne('gift_cards', { codigo: code, amount: amt, usuario_id: user.id, estado: 'pendiente', payment_reference: reference, created_at: new Date().toISOString() });
  return c.json({ success: true, codigo: code, reference });
});

app.get('/api/gift-cards/validate/:code', async (c) => {
  const result = await findOne('gift_cards', { codigo: c.req.param('code').toUpperCase(), estado: 'activa' });
  if (!result?.document) return c.json({ valida: false }, 404);
  return c.json({ valida: true, amount: result.document.amount });
});

app.post('/api/gift-cards/redeem', auth, adminRequired, async (c) => {
  const { codigo, citaId } = await c.req.json();
  const result = await findOne('gift_cards', { codigo: codigo.toUpperCase(), estado: 'activa' });
  if (!result?.document) return c.json({ error: 'Gift card inválida o ya usada' }, 400);
  await updateOne('gift_cards', { _id: result.document._id }, { $set: { estado: 'canjeada', canjeada_en: new Date().toISOString() } });
  if (citaId) await updateOne('citas', { _id: citaId }, { $set: { estado: 'confirmada', pago: 'gift_card', gift_card: codigo } });
  return c.json({ success: true, amount: result.document.amount });
});

// ─────────────────────────────────────────────
// PAYMENTS
// ─────────────────────────────────────────────

app.post('/api/payments/checkout', async (c) => {
  const body = await c.req.json();
  const { amount, description, returnUrl, customerEmail } = body;
  const reference = generateRef();
  const merchantId = c.env.CREDIBANCO_MERCHANT_ID;
  const apiKey = c.env.CREDIBANCO_API_KEY;
  if (!merchantId || !apiKey) {
    return c.json({ sessionId: `sim-${Date.now()}`, checkoutUrl: `${returnUrl}?ref=${reference}&sim=true`, reference });
  }
  const apiUrl = c.env.CREDIBANCO_API_URL || 'https://api.credibanco.com/checkout/v1/sessions';
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ merchantId, reference, description, amount: Math.round(amount), currency: 'COP', returnUrl, customerEmail }),
  });
  if (!res.ok) {
    const text = await res.text();
    return c.json({ error: `Credibanco error ${res.status}: ${text}` }, 502);
  }
  const data = await res.json();
  return c.json({ sessionId: data.sessionId, checkoutUrl: data.checkoutUrl, reference });
});

app.post('/api/payments/webhook', async (c) => {
  const body = await c.req.json();
  if (!body.reference || !body.status) return c.json({ error: 'invalid payload' }, 400);
  if (body.status === 'APPROVED') {
    await updateOne('citas', { pago_referencia: body.reference }, { $set: { estado: 'confirmada', pago: 'credibanco' } });
  }
  return c.json({ success: true });
});

app.get('/api/payments/qr', async (c) => {
  const url = c.req.query('url') || 'https://luxuryservice.co';
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
  const res = await fetch(qrUrl);
  const blob = await res.arrayBuffer();
  return new Response(blob, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' } });
});

// ─────────────────────────────────────────────
// CHATBOT
// ─────────────────────────────────────────────

let chatbotCache: { services: any[]; products: any[]; loadedAt: number } | null = null;
const CHATBOT_CACHE_TTL = 300_000;

async function getChatbotCatalog(c: any) {
  if (chatbotCache && Date.now() - chatbotCache.loadedAt < CHATBOT_CACHE_TTL) return chatbotCache;
  const svcResult = await find('servicios', { activo: true }, { projection: { nombre: 1, descripcion: 1, precio_auto: 1, precio_camioneta: 1, precio_moto: 1, duracion_minutos: 1, categoria: 1, cotizar_local: 1 } });
  const prodResult = await find('productos', {});
  chatbotCache = { services: svcResult?.documents || [], products: prodResult?.documents || [], loadedAt: Date.now() };
  return chatbotCache;
}

function invalidateChatbotCache() { chatbotCache = null; }

function norm(text: string) {
  return text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}
function tokenize(text: string) {
  return norm(text).split(/[^a-z0-9]+/).filter(Boolean);
}
function detectVehiculo(text: string) {
  const t = norm(text);
  if (/\b(camioneta|4x4|todo terreno|suv|troca|pickup)\b/.test(t)) return 'camioneta';
  if (/\b(moto|motocicleta|picante|ciclomotor)\b/.test(t)) return 'moto';
  if (/\b(auto|automovil|carro|vehiculo|sedan|hatchback|furgoneta|van)\b/.test(t)) return 'auto';
  return null;
}

app.post('/api/chatbot', async (c) => {
  const { message, vehiculo } = await c.req.json();
  const raw = message || '';
  const lower = norm(raw);
  const v = vehiculo || detectVehiculo(raw);
  const catalog = await getChatbotCatalog(c);
  const label = v === 'auto' ? 'Automóvil' : v === 'camioneta' ? 'Camioneta' : v === 'moto' ? 'Moto' : null;

  const svcNorm = catalog.services.map((s: any) => ({ ...s, _key: norm(s.nombre), _tokens: tokenize(s.nombre) }));
  const servEncontrado = svcNorm.find((s: any) => lower.includes(s._key) || (s._tokens.filter((t: string) => t.length > 3).length > 0 && s._tokens.filter((t: string) => t.length > 3).every((t: string) => lower.includes(t))));

  if (/^(hola|buenas|buen[ao]s|hey|saludos|que mas|q mas|buen dia)/.test(lower))
    return c.json({ reply: `¡Hola! Soy el asistente de **Luxury Service Manga**.${!v ? '\n\n¿Qué tipo de vehículo tienes?\n• 🚗 Automóvil\n• 🚙 Camioneta\n• 🏍️ Moto' : ''}` });

  if (/\b(adios|chao|bye|hasta luego|nos vemos|gracias por tu|eso seria todo)\b/.test(lower))
    return c.json({ reply: '¡Hasta luego! Gracias por contactarnos.' });

  if (detectVehiculo(raw) && !vehiculo)
    return c.json({ reply: `¡Perfecto! Has seleccionado **${label}**.\n¿Qué deseas consultar?` });

  if (/\b(donde|ubicacion|direccion|como llegar)\b/.test(lower))
    return c.json({ reply: '📍 **Luxury Service Manga** en Cartagena, Colombia. Contáctanos para la dirección exacta.' });

  if (/\b(horario|hora|cuando atienden|a que hora|abren|cierra|disponib)\b/.test(lower))
    return c.json({ reply: '🕐 **Horarios:**\n• 10:00 a.m.\n• 2:00 p.m.\n\nAgenda en la web.' });

  if (/\b(agendar|quiero (una )?cita|reservar|apartar|turno|programar|pedir cita)\b/.test(lower))
    return c.json({ reply: '📅 Agenda en la web con tu correo. Elige servicio, fecha y horario.' });

  if (/\b(promoc|descuent|oferta|beneficio)\b/.test(lower))
    return c.json({ reply: '🎉 Al registrarte recibirás notificaciones de promociones.' });

  if (/\b(gracias|perfecto|ok|listo|genial|excelente|de acuerdo|muy bien|super|vale)\b/.test(lower))
    return c.json({ reply: '¡Con gusto! 😊 ¿Algo más?' });

  if (/\b(cotiza|presupuesto|cuanto (vale|cuesta|cobran|sale)|precio tiene|a como|tarifa|me cotiza|cotizacion)\b/.test(lower)) {
    if (!v) return c.json({ reply: '¿Tu vehículo es 🚗 Automóvil, 🚙 Camioneta o 🏍️ Moto?' });
    const disponibles = catalog.services.filter((s: any) => !s.cotizar_local);
    if (servEncontrado) {
      const p = servEncontrado[`precio_${v}`] || servEncontrado.precio_base;
      return c.json({ reply: `📋 **${servEncontrado.nombre}**: ${formatCOP(p)} · ${servEncontrado.duracion_minutos} min.` });
    }
    const lines = disponibles.slice(0, 10).map((s: any) => `• **${s.nombre}**: ${formatCOP(s[`precio_${v}`] || s.precio_base)}`).join('\n');
    return c.json({ reply: `📋 **Cotización para ${label}**:\n${lines}` });
  }

  if (/\b(precio|cuesta|vale|costo|cuanto (sale|cobran|dan)|tarifa)\b/.test(lower)) {
    if (!v) return c.json({ reply: '¿🚗 Automóvil, 🚙 Camioneta o 🏍️ Moto?' });
    if (servEncontrado) {
      const p = servEncontrado[`precio_${v}`] || servEncontrado.precio_base;
      return c.json({ reply: `💰 **${servEncontrado.nombre}**: ${formatCOP(p)} · ${servEncontrado.duracion_minutos} min.` });
    }
    const lines = catalog.services.filter((s: any) => !s.cotizar_local).slice(0, 12).map((s: any) => `• **${s.nombre}**: ${formatCOP(s[`precio_${v}`] || s.precio_base)}`).join('\n');
    return c.json({ reply: `💰 **Precios para ${label}**:\n${lines}` });
  }

  if (/\b(servicio|catalogo|mantenimiento|que (servicios|hacen)|que ofrecen|estetica|menu)\b/.test(lower)) {
    const lines = catalog.services.filter((s: any) => !s.cotizar_local).slice(0, 15).map((s: any) => `• **${s.nombre}**${v ? ': ' + formatCOP(s[`precio_${v}`] || s.precio_base) : ''}`).join('\n');
    return c.json({ reply: `📋 **SERVICIOS**${label ? ` (${label})` : ''}:\n${lines}` });
  }

  if (/\b(producto|tienda|comprar|stock|articulo)\b/.test(lower)) {
    const lines = catalog.products.slice(0, 10).map((p: any) => `• **${p.nombre}** — ${formatCOP(p.precio)}`).join('\n');
    return c.json({ reply: `🛒 **Productos:**\n${lines}\n\nCompra en la Tienda.` });
  }

  if (servEncontrado) {
    const p = v ? formatCOP(servEncontrado[`precio_${v}`] || servEncontrado.precio_base) : '';
    return c.json({ reply: `🔧 **${servEncontrado.nombre}**${p ? ': ' + p : ''}\n• ${servEncontrado.duracion_minutos} min.\n• ${servEncontrado.descripcion || ''}` });
  }

  return c.json({ reply: '🤖 No entendí. Puedo ayudarte con servicios, precios, horarios o agendar una cita.' });
});

// ─────────────────────────────────────────────
// CONTACT
// ─────────────────────────────────────────────

app.post('/api/contact', async (c) => {
  const { nombre, telefono, email, mensaje } = await c.req.json();
  if (!nombre?.trim() || !telefono?.trim() || !email?.trim()) return c.json({ error: 'Nombre, teléfono y correo son requeridos' }, 400);
  await insertOne('contactos', { nombre: nombre.trim(), telefono: telefono.trim(), email: email.trim().toLowerCase(), mensaje: mensaje?.trim() || '', created_at: new Date().toISOString() });
  return c.json({ success: true });
});

// ─────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────

app.get('/api/notifications', auth, async (c) => {
  const user = c.get('user') as any;
  const result = await find('notificaciones', { usuario_id: user.id }, { sort: { created_at: -1 } });
  return c.json(await toApiList(result?.documents || []));
});

app.put('/api/notifications/:id/read', auth, async (c) => {
  const user = c.get('user') as any;
  await updateOne('notificaciones', { _id: c.req.param('id'), usuario_id: user.id }, { $set: { leida: true } });
  return c.json({ success: true });
});

// ─────────────────────────────────────────────
// ADMIN - Appointments
// ─────────────────────────────────────────────

app.get('/api/admin/appointments', auth, adminRequired, async (c) => {
  const result = await find('citas', {}, { sort: { fecha: -1 } });
  return c.json(await toApiList(result?.documents || []));
});

app.put('/api/admin/appointments/:id/status', auth, adminRequired, async (c) => {
  const { estado } = await c.req.json();
  await updateOne('citas', { _id: c.req.param('id') }, { $set: { estado } });
  return c.json({ success: true });
});

// ─────────────────────────────────────────────
// ADMIN - Dashboard
// ─────────────────────────────────────────────

app.get('/api/admin/dashboard/analytics', auth, adminRequired, async (c) => {
  const dbReq = { dataSource: c.env.DATA_SOURCE, database: 'luxury_service' };
  return c.json({
    revenueTrend: [],
    appointmentsByStatus: [],
    clientsTrend: [],
    servicesBooked: [],
    totalClients: 0, totalAppointments: 0, totalServices: 0,
  });
});

app.get('/api/admin/dashboard/stats', auth, adminRequired, async (c) => {
  return c.json({ ingresos: 0, egresos: 0 });
});

app.get('/api/admin/dashboard/product-sales', auth, adminRequired, async (c) => {
  return c.json({ productStats: [], topProducts: [], bottomProducts: [] });
});

app.get('/api/admin/dashboard/export', auth, adminRequired, async (c) => {
  const result = await find('transacciones', {}, { sort: { fecha: 1 } });
  const rows = result?.documents || [];
  let csv = 'fecha,tipo,monto,descripcion\n';
  for (const r of rows) csv += `${r.fecha},${r.tipo},${r.monto},${r.descripcion}\n`;
  return new Response(csv, { headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename=reporte.csv' } });
});

// ─────────────────────────────────────────────
// ADMIN - Services CRUD
// ─────────────────────────────────────────────

app.get('/api/admin/services', auth, adminRequired, async (c) => {
  const result = await find('servicios', {}, { sort: { orden: 1 } });
  return c.json(await toApiList(result?.documents || []));
});

app.post('/api/admin/services', auth, adminRequired, async (c) => {
  const body = await c.req.json();
  invalidateChatbotCache();
  await insertOne('servicios', { ...body, created_at: new Date().toISOString() });
  return c.json({ success: true });
});

app.put('/api/admin/services/:id', auth, adminRequired, async (c) => {
  const body = await c.req.json();
  invalidateChatbotCache();
  const setFields: Record<string, unknown> = {};
  for (const k of ['nombre', 'descripcion', 'categoria', 'subcategoria', 'items', 'precio_auto', 'precio_camioneta', 'precio_moto', 'duracion_minutos', 'agendable', 'icono', 'imagen_url', 'orden', 'activo', 'cotizar_local']) {
    if (body[k] !== undefined) setFields[k] = body[k];
  }
  await updateOne('servicios', { _id: c.req.param('id') }, { $set: setFields });
  return c.json({ success: true });
});

app.delete('/api/admin/services/:id', auth, adminRequired, async (c) => {
  invalidateChatbotCache();
  await deleteOne('servicios', { _id: c.req.param('id') });
  return c.json({ success: true });
});

// ─────────────────────────────────────────────
// ADMIN - Products CRUD
// ─────────────────────────────────────────────

app.get('/api/admin/products', auth, adminRequired, async (c) => {
  const result = await find('productos', {});
  return c.json(await toApiList(result?.documents || []));
});

app.post('/api/admin/products', auth, adminRequired, async (c) => {
  const { nombre, descripcion, precio, stock, categoria } = await c.req.json();
  await insertOne('productos', { nombre, descripcion, precio, stock, categoria, icono: 'inventory_2', color: '#4285F4', activo: true, created_at: new Date().toISOString() });
  return c.json({ success: true });
});

app.put('/api/admin/products/:id', auth, adminRequired, async (c) => {
  const setFields: Record<string, unknown> = {};
  const body = await c.req.json();
  for (const k of ['nombre', 'descripcion', 'precio', 'stock', 'categoria', 'activo']) {
    if (body[k] !== undefined) setFields[k] = body[k];
  }
  await updateOne('productos', { _id: c.req.param('id') }, { $set: setFields });
  return c.json({ success: true });
});

app.delete('/api/admin/products/:id', auth, adminRequired, async (c) => {
  await deleteOne('productos', { _id: c.req.param('id') });
  return c.json({ success: true });
});

// ─────────────────────────────────────────────
// ADMIN - Email Settings
// ─────────────────────────────────────────────

app.get('/api/admin/email-settings', auth, adminRequired, async (c) => {
  return c.json({
    host: c.env.CREDIBANCO_MERCHANT_ID ? 'configurado' : 'pendiente',
    status: 'email service via Resend API required for Workers. Set RESEND_API_KEY env var.',
  });
});

app.post('/api/admin/email-settings/test', auth, adminRequired, async (c) => {
  return c.json({ success: false, message: 'Email sending requires RESEND_API_KEY env var configured in Cloudflare dashboard.' });
});

// ─────────────────────────────────────────────
// ADMIN - Import
// ─────────────────────────────────────────────

app.post('/api/admin/import', auth, adminRequired, async (c) => {
  const fd = await c.req.formData();
  const file = fd.get('archivo') as File;
  const tipo = String(fd.get('tipo') || 'productos');
  if (!file) return c.json({ error: 'Debes subir un archivo' }, 400);
  const text = await file.text();
  const lines = text.split('\n').filter(Boolean);
  if (lines.length < 2) return c.json({ error: 'El archivo está vacío o no tiene datos' }, 400);
  const headers = lines[0].split(',').map((h: string) => h.trim());
  const rows = lines.slice(1).map((l: string) => {
    const vals = l.split(',').map((v: string) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => row[h] = vals[i] || '');
    return row;
  });

  let insertados = 0, actualizados = 0, errores: string[] = [];
  const collection = tipo === 'servicios' ? 'servicios' : 'productos';

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const nro = i + 2;
    if (!row.nombre?.trim()) { errores.push(`Fila ${nro}: falta el nombre`); continue; }
    if (tipo === 'productos' && fd.get('excludeFood') === 'true' && isFoodProduct(row.nombre, row.descripcion || '')) continue;
    try {
      const existing = await findOne(collection, { nombre: row.nombre.trim() });
      if (existing?.document) {
        const set: Record<string, unknown> = {};
        for (const k of Object.keys(row)) {
          if (k !== 'nombre') set[k] = row[k];
        }
        if (Object.keys(set).length > 0) {
          await updateOne(collection, { _id: existing.document._id }, { $set: set });
          actualizados++;
        }
      } else {
        await insertOne(collection, { ...row, activo: true, created_at: new Date().toISOString() });
        insertados++;
      }
    } catch (e: any) {
      errores.push(`Fila ${nro}: ${e.message}`);
    }
  }

  invalidateChatbotCache();
  return c.json({ success: true, insertados, actualizados, errores: errores.length > 0 ? errores : undefined });
});

// ─────────────────────────────────────────────
// ADMIN - Dashboard PowerBI
// ─────────────────────────────────────────────

app.get('/api/admin/dashboard/powerbi', auth, adminRequired, async (c) => {
  const transacciones = await find('transacciones', {}, { sort: { fecha: 1 } });
  const citas = await find('citas', {}, { sort: { fecha: 1 } });
  const usuarios = await find('usuarios', {}, { sort: { created_at: 1 } });
  const productos = await find('productos', {}, { sort: { nombre: 1 } });
  const servicios = await find('servicios', {}, { sort: { nombre: 1 } });
  return c.json({
    transacciones: transacciones?.documents || [],
    citas: citas?.documents || [],
    usuarios: usuarios?.documents || [],
    productos: productos?.documents || [],
    servicios: servicios?.documents || [],
  });
});

// ─────────────────────────────────────────────
// ADMIN - Clientes / Users
// ─────────────────────────────────────────────

app.get('/api/admin/users', auth, adminRequired, async (c) => {
  const result = await find('usuarios', {}, { sort: { created_at: -1 } });
  return c.json(await toApiList(result?.documents || []));
});

// ─────────────────────────────────────────────
// CRON
// ─────────────────────────────────────────────

app.get('/cron', async (c) => {
  const today = new Date().toISOString().slice(0, 10);
  await updateOne('citas', { fecha: { $lt: today }, estado: { $nin: ['completada', 'cancelada', 'expirada'] } }, { $set: { estado: 'expirada' } });
  return c.json({ success: true });
});

async function scheduled(event: any, env: any, ctx: any) {
  initMongo({ url: env.DATA_API_URL, apiKey: env.DATA_API_KEY, dataSource: env.DATA_SOURCE, database: 'luxury_service' });
  const today = new Date().toISOString().slice(0, 10);
  await updateOne('citas', { fecha: { $lt: today }, estado: { $nin: ['completada', 'cancelada', 'expirada'] } }, { $set: { estado: 'expirada' } });
}

export default { fetch: app.fetch, scheduled };
