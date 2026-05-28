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

const FALLBACK_SERVICIOS = [
  { nombre: 'Lavado General Exterior', descripcion: 'Lavado exterior completo', duracion_minutos: 30, categoria: 'Lavado', cotizar_local: false },
  { nombre: 'Lavado Completo Premium', descripcion: 'Lavado exterior e interior completo', duracion_minutos: 60, categoria: 'Lavado', cotizar_local: false },
  { nombre: 'Lavado de Motor', descripcion: 'Limpieza profunda del motor', duracion_minutos: 45, categoria: 'Lavado', cotizar_local: true },
  { nombre: 'Lavado de Tapicería', descripcion: 'Limpieza profunda de asientos y tapicería', duracion_minutos: 60, categoria: 'Lavado', cotizar_local: false },
  { nombre: 'Pulido General', descripcion: 'Pulido de pintura completo', duracion_minutos: 120, categoria: 'Pulido', cotizar_local: false },
  { nombre: 'Pulido de Faros', descripcion: 'Restauración de faros opacos', duracion_minutos: 30, categoria: 'Pulido', cotizar_local: false },
  { nombre: 'Encerado', descripcion: 'Aplicación de cera protectora', duracion_minutos: 45, categoria: 'Pulido', cotizar_local: false },
  { nombre: 'Polarizados', descripcion: 'Instalación de película polarizada', duracion_minutos: 90, categoria: 'Polarizados', cotizar_local: true },
  { nombre: 'Detailing Interior', descripcion: 'Limpieza y acondicionamiento interior completo', duracion_minutos: 90, categoria: 'Detailing', cotizar_local: false },
  { nombre: 'Detailing Exterior', descripcion: 'Lavado, pulido, encerado y protección', duracion_minutos: 150, categoria: 'Detailing', cotizar_local: false },
  { nombre: 'Tratamiento Nanocerámico', descripcion: 'Protección de pintura con nanocerámica', duracion_minutos: 240, categoria: 'Detailing', cotizar_local: false },
  { nombre: 'Cambio de Aceite', descripcion: 'Cambio de aceite y filtro', duracion_minutos: 30, categoria: 'Lubricación', cotizar_local: false },
  { nombre: 'Limpieza de Inyectores', descripcion: 'Limpieza ultrasónica de inyectores', duracion_minutos: 60, categoria: 'Mecánica', cotizar_local: false },
  { nombre: 'Alineación y Balanceo', descripcion: 'Alineación y balanceo de llantas', duracion_minutos: 45, categoria: 'Llantas', cotizar_local: false },
  { nombre: 'Scanner Automotriz', descripcion: 'Diagnóstico electrónico del vehículo', duracion_minutos: 30, categoria: 'Mecánica', cotizar_local: false },
];

const FALLBACK_PRODUCTOS = [
  { nombre: 'Aceite sintético 5W-30', descripcion: 'Alto rendimiento', stock: 24, categoria: 'Lubricantes' },
  { nombre: 'Filtro de aceite', descripcion: 'Estándar', stock: 40, categoria: 'Repuestos' },
  { nombre: 'Cera nanocerámica', descripcion: 'Protección pintura', stock: 12, categoria: 'Detailing' },
  { nombre: 'Lavado Completo Premium', descripcion: 'Lavado exterior e interior completo', stock: 99, categoria: 'Lavado' },
  { nombre: 'Ambientador automotriz', descripcion: 'Fragancia duradera', stock: 50, categoria: 'Accesorios' },
  { nombre: 'Paño de microfibra x3', descripcion: 'Set de paños de microfibra', stock: 35, categoria: 'Accesorios' },
];

let chatbotCache: { services: any[]; products: any[]; loadedAt: number } | null = null;
const CHATBOT_CACHE_TTL = 300_000;

async function getChatbotCatalog(c: any) {
  if (chatbotCache && Date.now() - chatbotCache.loadedAt < CHATBOT_CACHE_TTL) return chatbotCache;
  try {
    const svcResult = await find('servicios', { activo: true }, { projection: { nombre: 1, descripcion: 1, duracion_minutos: 1, categoria: 1, cotizar_local: 1 } });
    const prodResult = await find('productos', {});
    chatbotCache = { services: svcResult?.documents || FALLBACK_SERVICIOS, products: prodResult?.documents || FALLBACK_PRODUCTOS, loadedAt: Date.now() };
  } catch (e) {
    if (chatbotCache) return chatbotCache;
    chatbotCache = { services: FALLBACK_SERVICIOS, products: FALLBACK_PRODUCTOS, loadedAt: Date.now() };
  }
  return chatbotCache;
}

function invalidateChatbotCache() { chatbotCache = null; }

function norm(text: string) {
  return text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}
function tokenize(text: string) {
  return norm(text).split(/[^a-z0-9]+/).filter(Boolean);
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function fuzzyMatch(query: string, target: string): number {
  const q = norm(query);
  const t = norm(target);
  const dist = levenshtein(q, t);
  const maxLen = Math.max(q.length, t.length);
  return maxLen === 0 ? 1 : 1 - dist / maxLen;
}

function fuzzyIncludes(text: string, phrase: string, threshold = 0.75): boolean {
  const words = phrase.split(/\s+/);
  const textWords = text.split(/\s+/);
  let matched = 0;
  for (const pw of words) {
    if (pw.length < 3) continue;
    for (const tw of textWords) {
      if (fuzzyMatch(tw, pw) >= threshold) { matched++; break; }
    }
  }
  return matched >= Math.max(1, words.filter(w => w.length >= 3).length * 0.6);
}

function scoreIntent(lower: string, tokens: string[], keywords: { word: string; weight: number }[]): number {
  let score = 0;
  for (const kw of keywords) {
    if (lower.includes(kw.word)) {
      score += kw.weight;
    } else {
      for (const token of tokens) {
        if (fuzzyMatch(token, kw.word) >= 0.75) { score += kw.weight * 0.7; break; }
      }
    }
  }
  return score;
}

function detectVehiculo(text: string) {
  const t = norm(text);
  if (/\b(camioneta|4x4|todo terreno|suv|troca|pickup|troc|camion|blazer|trailblazer|explorer|duster|tracker|vitara)\b/.test(t)) return 'camioneta';
  if (/\b(moto|motocicleta|picante|ciclomotor|pistera|cross|enduro|scooter|vespa)\b/.test(t)) return 'moto';
  if (/\b(auto|automovil|carro|vehiculo|sedan|hatchback|furgoneta|van|furgon|deportivo|coupe|aveo|spark|swift|picanto|logan|sandero)\b/.test(t)) return 'auto';
  return null;
}

app.post('/api/chatbot', async (c) => {
  try {
    const { message, vehiculo } = await c.req.json();
    const raw = message || '';
    const lower = norm(raw);
    const tokens = tokenize(raw);
    const v = vehiculo || detectVehiculo(raw);
    const catalog = await getChatbotCatalog(c);
    const label = v === 'auto' ? 'Automóvil' : v === 'camioneta' ? 'Camioneta' : v === 'moto' ? 'Moto' : null;

    const svcNorm = catalog.services.map((s: any) => ({
      ...s, _key: norm(s.nombre), _tokens: tokenize(s.nombre)
    }));
    let servEncontrado = svcNorm.find((s: any) =>
      lower.includes(s._key) || fuzzyIncludes(lower, s._key) ||
      (s._tokens.filter((t: string) => t.length > 3).length > 0 &&
       s._tokens.filter((t: string) => t.length > 3).every((t: string) => lower.includes(t) || fuzzyIncludes(lower, t)))
    );

    let prodEncontrado = catalog.products.find((p: any) => {
      const key = norm(p.nombre);
      return lower.includes(key) || fuzzyIncludes(lower, key);
    });

    const INTENTS = [
      {
        name: 'saludo',
        keywords: [
          { word: 'hola', weight: 5 }, { word: 'buenas', weight: 5 }, { word: 'buenos', weight: 5 },
          { word: 'saludos', weight: 5 }, { word: 'hey', weight: 4 }, { word: 'buen dia', weight: 5 },
          { word: 'que mas', weight: 4 }, { word: 'buenas tardes', weight: 5 }, { word: 'buenas noches', weight: 5 },
        ],
        minScore: 4,
        handler: () => `¡Hola! Soy el asistente de **Luxury Service Manga**.${!v ? '\n\n¿Qué tipo de vehículo tienes?\n• 🚗 Automóvil\n• 🚙 Camioneta\n• 🏍️ Moto' : `\n\nVeo que tienes **${label}**. ¿En qué puedo ayudarte?\n• Servicios disponibles\n• Horarios: 10:00 a.m. y 2:00 p.m.\n• Agendar una cita`}`
      },
      {
        name: 'despedida',
        keywords: [
          { word: 'adios', weight: 6 }, { word: 'chao', weight: 6 }, { word: 'bye', weight: 6 },
          { word: 'hasta luego', weight: 6 }, { word: 'nos vemos', weight: 6 }, { word: 'eso seria todo', weight: 5 },
          { word: 'gracias por tu', weight: 4 }, { word: 'hasta pronto', weight: 6 },
        ],
        minScore: 3,
        handler: () => '¡Hasta luego! Gracias por contactarnos. **Luxury Service** a tu servicio 🚗✨'
      },
      {
        name: 'ubicacion',
        keywords: [
          { word: 'donde', weight: 5 }, { word: 'ubicacion', weight: 6 }, { word: 'direccion', weight: 6 },
          { word: 'como llegar', weight: 6 }, { word: 'maps', weight: 5 }, { word: 'queda', weight: 4 },
        ],
        minScore: 4,
        handler: () => '📍 **Luxury Service Manga** en **Cartagena, Colombia**.\nAv. Principal Manga.\n\n¿Necesitas el teléfono o prefieres agendar una cita?'
      },
      {
        name: 'contacto',
        keywords: [
          { word: 'contacto', weight: 6 }, { word: 'telefono', weight: 6 }, { word: 'whatsapp', weight: 6 },
          { word: 'correo', weight: 5 }, { word: 'email', weight: 5 }, { word: 'llamar', weight: 5 },
          { word: 'celular', weight: 5 }, { word: 'wsp', weight: 5 }, { word: 'asesor', weight: 5 },
          { word: 'numero', weight: 4 }, { word: 'contactarnos', weight: 5 },
        ],
        minScore: 4,
        handler: () => '📬 **Comunícate con nosotros:**\n\n📞 **Teléfono:** +57 300 636 6429\n💬 **WhatsApp:** wa.me/573006366429\n✉️ **Correo:** luxury_admon@outlook.com\n\n¿Necesitas ayuda con algo más?'
      },
      {
        name: 'horarios',
        keywords: [
          { word: 'horario', weight: 6 }, { word: 'hora', weight: 4 }, { word: 'cuando atienden', weight: 6 },
          { word: 'a que hora', weight: 5 }, { word: 'abren', weight: 5 }, { word: 'cierran', weight: 5 },
          { word: 'atienden', weight: 5 }, { word: 'turno', weight: 4 },
        ],
        minScore: 4,
        handler: () => '🕐 **Horarios de atención:**\n• **Lunes a sábado:** 8:00 a.m. - 6:00 p.m.\n• **Citas:** 10:00 a.m. y 2:00 p.m.\n• **Domingos:** Cerrado\n\nAgenda en la web.'
      },
      {
        name: 'agendar',
        keywords: [
          { word: 'agendar', weight: 6 }, { word: 'cita', weight: 5 }, { word: 'reservar', weight: 5 },
          { word: 'apartar', weight: 5 }, { word: 'turno', weight: 4 }, { word: 'programar', weight: 4 },
          { word: 'pedir cita', weight: 6 }, { word: 'sacar cita', weight: 5 }, { word: 'necesito cita', weight: 5 },
        ],
        minScore: 4,
        handler: () => servEncontrado
          ? `📅 **Agendar: ${servEncontrado.nombre}**\n\n1. Entra con tu correo en "Acceder"\n2. Selecciona **${servEncontrado.nombre}**\n3. Escoge fecha y horario\n4. Confirma ✅`
          : '📅 Agenda en la web con tu correo. Elige servicio, fecha y horario (10:00 a.m. o 2:00 p.m.).'
      },
      {
        name: 'cotizacion',
        keywords: [
          { word: 'cotizar', weight: 6 }, { word: 'cotizacion', weight: 6 }, { word: 'presupuesto', weight: 6 },
          { word: 'cuanto vale', weight: 5 }, { word: 'cuanto cuesta', weight: 5 }, { word: 'cuanto cobran', weight: 5 },
          { word: 'tarifa', weight: 5 }, { word: 'me cotiza', weight: 6 }, { word: 'valor', weight: 4 },
        ],
        minScore: 4,
        handler: () => {
          if (!v) return '¿Tu vehículo es 🚗 Automóvil, 🚙 Camioneta o 🏍️ Moto?';
          const disponibles = catalog.services.filter((s: any) => !s.cotizar_local);
          if (servEncontrado) return `📋 **${servEncontrado.nombre}** · ${servEncontrado.duracion_minutos} min.\n\nLos precios de referencia están en la sección Cotizar.`;
          const lines = disponibles.slice(0, 10).map((s: any) => `• **${s.nombre}**`).join('\n');
          return `📋 **Servicios para ${label}**:\n${lines}`;
        }
      },
      {
        name: 'servicios',
        keywords: [
          { word: 'servicios', weight: 6 }, { word: 'servicio', weight: 5 }, { word: 'catalogo', weight: 5 },
          { word: 'mantenimiento', weight: 4 }, { word: 'que servicios', weight: 6 }, { word: 'que ofrecen', weight: 5 },
          { word: 'menu', weight: 3 },
        ],
        minScore: 4,
        handler: () => {
          const disponibles = catalog.services.filter((s: any) => !s.cotizar_local).slice(0, 18);
          const lines = disponibles.map((s: any) => `• **${s.nombre}**`).join('\n');
          return `📋 **SERVICIOS**${label ? ` (${label})` : ''}:\n${lines}`;
        }
      },
      {
        name: 'productos',
        keywords: [
          { word: 'producto', weight: 6 }, { word: 'productos', weight: 6 }, { word: 'tienda', weight: 5 },
          { word: 'comprar', weight: 5 }, { word: 'stock', weight: 4 }, { word: 'articulo', weight: 4 },
          { word: 'venden', weight: 4 },
        ],
        minScore: 4,
        handler: () => {
          if (prodEncontrado) return `🛒 **${prodEncontrado.nombre}**\n${prodEncontrado.descripcion}\nStock: ${prodEncontrado.stock > 0 ? '✅ ' + prodEncontrado.stock + ' unidades' : '❌ Agotado'}`;
          const lines = catalog.products.slice(0, 10).map((p: any) => `• **${p.nombre}** — ${p.stock > 0 ? `${p.stock} disp.` : 'agotado'}`).join('\n');
          return `🛒 **Productos:**\n${lines}\n\nCompra en la Tienda.`;
        }
      },
      {
        name: 'precios',
        keywords: [
          { word: 'precio', weight: 6 }, { word: 'cuesta', weight: 5 }, { word: 'vale', weight: 4 },
          { word: 'costo', weight: 5 }, { word: 'cuanto sale', weight: 5 }, { word: 'cuanto cobran', weight: 5 },
        ],
        minScore: 3,
        handler: () => {
          if (!v) return '¿🚗 Automóvil, 🚙 Camioneta o 🏍️ Moto?';
          if (servEncontrado) return `🔧 **${servEncontrado.nombre}** · ${servEncontrado.duracion_minutos} min.\n\nLos valores de referencia están en la sección Cotizar.`;
          const lines = catalog.services.filter((s: any) => !s.cotizar_local).slice(0, 12).map((s: any) => `• **${s.nombre}**`).join('\n');
          return `📋 **Servicios para ${label}**:\n${lines}\n\nVer valores en Cotizar.`;
        }
      },
      {
        name: 'agradecimiento',
        keywords: [
          { word: 'gracias', weight: 6 }, { word: 'perfecto', weight: 4 }, { word: 'listo', weight: 4 },
          { word: 'genial', weight: 4 }, { word: 'excelente', weight: 4 }, { word: 'muy bien', weight: 4 },
          { word: 'vale', weight: 3 }, { word: 'entendido', weight: 4 },
        ],
        minScore: 3,
        handler: () => '¡Con gusto! 😊 ¿Algo más en que pueda ayudarte?'
      },
      {
        name: 'vehiculo_solo',
        keywords: [
          { word: 'automovil', weight: 3 }, { word: 'camioneta', weight: 3 }, { word: 'moto', weight: 3 },
          { word: 'carro', weight: 3 }, { word: 'auto', weight: 3 }, { word: 'vehiculo', weight: 2 },
          { word: 'motocicleta', weight: 3 },
        ],
        minScore: 3,
        handler: () => {
          const vehicleWords = ['auto', 'automovil', 'carro', 'vehiculo', 'camioneta', 'moto', 'motocicleta', '4x4', 'suv', 'troca', 'pickup'];
          const onlyVehicle = tokens.every(t => vehicleWords.includes(t));
          if (!onlyVehicle && tokens.length > 2) return null;
          const msgWords = lower.split(/\s+/).filter(Boolean);
          if (msgWords.length > 4) return null;
          if (!v) return '¿Tu vehículo es 🚗 Automóvil, 🚙 Camioneta o 🏍️ Moto?';
          return `¡Perfecto! Has seleccionado **${label}**. ¿Qué deseas consultar?\n• Servicios disponibles\n• Horarios: 10:00 a.m. y 2:00 p.m.\n• Agendar una cita`;
        }
      },
    ];

    let best: { handler: () => string; score: number } | null = null;
    for (const intent of INTENTS) {
      const score = scoreIntent(lower, tokens, intent.keywords);
      if (score >= intent.minScore && (!best || score > best.score)) {
        best = { handler: intent.handler, score };
      }
    }

    if (best) {
      const reply = best.handler();
      if (reply) return c.json({ reply });
    }

    if (servEncontrado) {
      return c.json({ reply: `🔧 **${servEncontrado.nombre}**\n• ${servEncontrado.duracion_minutos} min.\n• ${servEncontrado.descripcion || ''}` });
    }

    if (prodEncontrado) {
      return c.json({ reply: `🛒 **${prodEncontrado.nombre}**\n${prodEncontrado.descripcion}\nStock: ${prodEncontrado.stock > 0 ? '✅ ' + prodEncontrado.stock + ' unidades' : '❌ Agotado'}` });
    }

    if (!v) return c.json({ reply: '🤖 No entendí. ¿Tu vehículo es 🚗 Automóvil, 🚙 Camioneta o 🏍️ Moto?\n\nTambién puedes preguntar por servicios, horarios o agendar una cita.' });

    const CATEGORIA_MAP: [RegExp, string[]][] = [
      [/\b(lavados?|hidroblast|chasis|vapores?|encerados?|combos?|express|espumas?|lavar)/, ['Servicios Básicos', 'Combos', 'Lavado']],
      [/\b(alineacion|balanceo|llantas?|suspension|faros?|direccion|amortiguadores?|cauchos?|neumaticos?|rines?)/, ['Alineación y Balanceo']],
      [/\b(frenos?|pastillas?|bandas?|liquido de freno|calipers?|discos?)/, ['Mantenimiento de Frenos']],
      [/\b(lubric|cambio de aceite|cambio aceite|filtros?|aceites?|engrases?)/, ['Lubricación']],
      [/\b(detailing|pulidos?|ceramicos?|nano|rayon|farolas?|tapicer|luxury|detallados?|pulir|brillo|cera)/, ['Servicios Detailing', 'Detailing']],
      [/\b(polarizados?|polarizacion|vidrios?|peliculas?|polarizar|film)/, ['Polarizados']],
      [/\b(pinturas?|pintar|latoneria|latas|enderezada|chapista|carroceria|repintar)/, ['Servicios de Pintura', 'Pintura']],
      [/\b(diagnosti|scan|computador|escaneo|electr|fallas?|test|chequeos?)/, ['Diagnóstico']],
    ];

    for (const [pattern, cats] of CATEGORIA_MAP) {
      if (pattern.test(lower)) {
        const items = catalog.services.filter((s: any) => !s.cotizar_local && cats.includes(s.categoria));
        if (items.length > 0) {
          const lines = items.map((s: any) => `• **${s.nombre}**`).join('\n');
          return c.json({ reply: `🔧 **${items[0].categoria?.toUpperCase() || 'SERVICIOS'}** (${label}):\n${lines}` });
        }
      }
    }

    const sinServicios = Object.entries({
      'Lavado': ['lavado', 'lavar', 'limpieza', 'aseo', 'espuma'],
      'Detailing': ['detailing', 'detallado', 'pulido', 'brillo', 'cera', 'pulir'],
      'Polarizados': ['polarizado', 'pelicula', 'vidrio polarizado', 'film'],
      'Pintura': ['pintura', 'pintar', 'latoneria', 'carroceria'],
      'Mecánica': ['mecanica', 'mecanico', 'reparacion', 'mantenimiento'],
    }).find(([_, words]) => words.some(w => lower.includes(w) || fuzzyIncludes(lower, w)));

    if (sinServicios) {
      const items = catalog.services.filter((s: any) => !s.cotizar_local && s.categoria === sinServicios[0]);
      if (items.length > 0) {
        const lines = items.map((s: any) => `• **${s.nombre}**`).join('\n');
        return c.json({ reply: `🔧 **${sinServicios[0].toUpperCase()}** (${label}):\n${lines}` });
      }
    }

    return c.json({ reply: '🤖 No entendí completamente. Puedo ayudarte con:\n• **Servicios** disponibles\n• **Horarios**: 10:00 a.m. y 2:00 p.m.\n• **Agendar** una cita\n• **Productos** en tienda\n• **Contacto** y ubicación\n\nEj: "Qué servicios tienen?", "Cómo agendar una cita?"' });
  } catch (e) {
    console.error('[chatbot] Error:', e);
    return c.json({ reply: '🤖 No entendí completamente. Puedo ayudarte con:\n• **Servicios** disponibles\n• **Horarios**: 10:00 a.m. y 2:00 p.m.\n• **Agendar** una cita\n• **Productos** en tienda\n• **Contacto** y ubicación\n\nEj: "Qué servicios tienen?", "Cómo agendar una cita?"' });
  }
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
