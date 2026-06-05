import crypto from 'crypto';
import { getDb, ObjectId } from './db.js';

export const HORARIO_LABELS: Record<string, string> = {
  '07:00': '7:00 a.m.',
  '08:00': '8:00 a.m.',
  '09:00': '9:00 a.m.',
  '10:00': '10:00 a.m.',
  '11:00': '11:00 a.m.',
  '12:00': '12:00 p.m.',
  '13:00': '1:00 p.m.',
  '14:00': '2:00 p.m.',
  '15:00': '3:00 p.m.',
  '16:00': '4:00 p.m.',
  '17:00': '5:00 p.m.',
  '18:00': '6:00 p.m.',
  '19:00': '7:00 p.m.'
};
export const HORARIOS = ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00'] as const;
export const HORARIOS_DOMINGO = ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00'] as const;

export type Vehiculo = 'auto' | 'camioneta' | 'moto';

export interface ChatTurn {
  role: 'user' | 'bot';
  text: string;
  vehiculo?: Vehiculo;
  intent?: string;
}

interface ServiceItem {
  _id?: string;
  nombre: string;
  descripcion: string;
  duracion_minutos: number;
  categoria?: string;
  cotizar_local?: boolean;
  precio_base?: number;
  precio_auto?: number;
  precio_camioneta?: number;
  precio_moto?: number;
}

interface ProductItem {
  _id?: string;
  nombre: string;
  descripcion: string;
  stock: number;
  categoria?: string;
  precio?: number;
}

interface CatalogCache {
  services: ServiceItem[];
  products: ProductItem[];
  loadedAt: number;
}

let cache: CatalogCache | null = null;
const CACHE_TTL = 300_000;

function norm(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function tokenize(text: string): string[] {
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

async function getCatalog(): Promise<CatalogCache> {
  if (cache && Date.now() - cache.loadedAt < CACHE_TTL) return cache;
  try {
    const db = getDb();
    const [services, products] = await Promise.all([
      db.collection('servicios').find({ activo: true })
        .project({ nombre: 1, descripcion: 1, duracion_minutos: 1, categoria: 1, cotizar_local: 1, precio_base: 1, precio_auto: 1, precio_camioneta: 1, precio_moto: 1 })
        .toArray(),
      db.collection('productos').find({
        nombre: { $not: /\b(CAFE|CAFÉ|TINTO|CAPUCCINO|CAPUCHINO|COCOSET|COCOSETTE|ABUELITA|NESCAFE|LATTES|LATTE|CHOCOLATE|CERVEZA|GASEOSA|GATORADE|JUGO|GALLETA|CHIPS|CHEETOS|DORITOS|DETODITO|FRITOLAY|CHOKIS|MONSTER ENERGY|RED BULL|PALETA|PALETTA|PALETT)\b/i }
        })
        .project({ nombre: 1, descripcion: 1, stock: 1, categoria: 1, precio: 1 })
        .toArray()
    ]);
    cache = {
      services: services as unknown as ServiceItem[],
      products: products as unknown as ProductItem[],
      loadedAt: Date.now()
    };
  } catch (err) {
    if (cache) return cache;
    cache = { services: [], products: [], loadedAt: Date.now() };
  }
  return cache;
}

export async function initChatbotCache(): Promise<void> {
  try {
    cache = null;
    await getCatalog();
    console.log('[chatbot] Catálogo precargado en caché');
  } catch (err) {
    console.warn('[chatbot] No se pudo precargar caché al inicio:', (err as Error).message);
  }
}

const VEHICULO_PATTERNS: [RegExp, Vehiculo][] = [
  [/\b(camioneta|4x4|todo terreno|todo?terreno|suv|camioneta|troca|pickup|troc|camion|blazer|trailblazer|explorer|duster|tracker|vitara|grand vitara|grand vitara|territory|ecosport|equinox|tucson|sorento|sportage|rav4|fortuner|hilux|ranger|s10|dmax|navigator|navara|frontier|patrol|yukon|tahoe|suburban|escalade)\b/, 'camioneta'],
  [/\b(moto|motocicleta|picante|ciclomotor|bicicleta motorizada|pistera|cross|enduro|scooter|vespa|naked|chopper|custom|deportiva|boxer|pulsar|akt|hero|honda cb|yamaha|suzuki|kawasaki|bajaj|tvs)\b/, 'moto'],
];

export function detectarVehiculo(text: string): Vehiculo | null {
  const t = norm(text);
  for (const [pattern, v] of VEHICULO_PATTERNS) {
    if (pattern.test(t)) return v;
  }
  if (/\b(auto|automovil|carro|vehiculo|berlina|sedan|hatchback|furgoneta|van|furgon|familiar|deportivo|coupe|chevette|aveo|spark|swift|picanto|logan|sandero|twingo|onix|prisma|cruze|voyage|gol|up|fox|virtus|polo|jetta|passat|tiguan|vento|hb20|hb20s|creta|i30|elantra|sonata|tucson|civic|city|fit|cv|cronos|argo|uno|mobi|palio|siena|strada|toro|renault 4|renault 12|megane|kangoo|duster|sandero|logan|fluence|clio|symbol|kwid|twingo|master)\b/.test(t)) return 'auto';
  return null;
}

const SINONIMOS_SERVICIOS: Record<string, string[]> = {
  'Lavado': ['lavado', 'lavar', 'limpieza', 'aseo', 'enjuagar', 'espuma', 'lavar carro', 'lavar auto', 'lavar vehiculo', 'lavada', 'lavadero', 'limpiar', 'limpia'],
  'Detailing': ['detailing', 'detallado', 'pulido', 'brillo', 'encerado', 'cera', 'abrillantar', 'detalle', 'pulir', 'brillar', 'detallar', 'acabado', 'embellecer', 'restauracion'],
  'Polarizados': ['polarizado', 'polarizar', 'polarizacion', 'pelicula', 'vidrio polarizado', 'oscurecer vidrios', 'papel polarizado', 'opaco', 'polarizar vidrios', 'pelicula seguridad', 'film', 'blackout', 'oscurecer', 'tint'],
  'Mecánica': ['mecanica', 'mecanico', 'reparacion', 'arreglo', 'mantenimiento', 'revision', 'mecanica general', 'taller', 'reparar', 'arreglar', 'falla', 'daño', 'problema'],
  'Pintura': ['pintura', 'pintar', 'latoneria', 'enderezado', 'pintura vehiculo', 'carroceria', 'repintar', 'pintar carro', 'pintura completa', 'retocar', 'color'],
  'Hidroblasting': ['hidroblast', 'hidrolavado', 'hidro', 'lavado presion', 'lavado motor', 'agua presion', 'hidrolavadora', 'presion'],
  'Alineación y Balanceo': ['alineacion', 'balanceo', 'alinear', 'balancear', 'llantas', 'ruedas', 'direccion', 'vibracion', 'volante'],
  'Frenos': ['frenos', 'frenar', 'pastillas', 'discos', 'liquido frenos', 'freno'],
};

const HORARIO_LINEA = HORARIOS.map(h => HORARIO_LABELS[h] || h);
const HORARIOS_TEXTO = HORARIO_LINEA.slice(0, 3).join(', ') + ', ' + HORARIO_LINEA.slice(3, -1).join(', ') + ' y ' + HORARIO_LINEA[HORARIO_LINEA.length - 1];

// ── Helpers ──────────────────────────────────────────────────────

function formatoServicio(s: ServiceItem, v?: Vehiculo | null): string {
  const desc = s.descripcion ? s.descripcion.slice(0, 60) : '';
  const extras = s.duracion_minutos > 0 ? `⏱ ${s.duracion_minutos} min` : '';
  return `• **${s.nombre}** ${extras ? `— ${extras}` : ''}${desc ? `\n   ${desc}${s.descripcion.length > 60 ? '…' : ''}` : ''}`;
}

function servicioDetalle(s: ServiceItem, v?: Vehiculo | null): string {
  let out = `🔧 **${s.nombre}**`;
  if (s.duracion_minutos > 0) out += ` — ⏱ Aprox. ${s.duracion_minutos} min`;
  if (s.descripcion) out += `\n📝 ${s.descripcion}`;
  return out;
}

// ── Context ───────────────────────────────────────────────────────

interface ChatContext {
  raw: string;
  lower: string;
  tokens: string[];
  v: Vehiculo | null;
  label: string | null;
  catalog: CatalogCache;
  serviciosEncontrados: ServiceItem[];
  productosEncontrados: ProductItem[];
}

function buildContext(raw: string, vehiculo: Vehiculo | null | undefined, catalog: CatalogCache): ChatContext {
  const lower = norm(raw);
  const tokens = tokenize(raw);
  const v = vehiculo || detectarVehiculo(raw) || null;
  const label = v ? (v === 'auto' ? 'Automóvil' : v === 'camioneta' ? 'Camioneta' : 'Moto') : null;

  // Find matching services sorted by relevance
  const scoredServices: { item: ServiceItem; score: number }[] = [];
  for (const s of catalog.services) {
    const key = norm(s.nombre);
    let score = 0;
    if (lower.includes(key)) score += 5;
    if (fuzzyIncludes(lower, key)) score += 3;
    const tokens = tokenize(s.nombre).filter(t => t.length > 3);
    for (const t of tokens) {
      if (lower.includes(t)) score += 2;
      else if (fuzzyIncludes(lower, t)) score += 1;
    }
    if (score > 0) scoredServices.push({ item: s, score });
  }
  scoredServices.sort((a, b) => b.score - a.score);
  const serviciosEncontrados = scoredServices.slice(0, 5).map(s => s.item);

  // Find matching products
  const scoredProducts: { item: ProductItem; score: number }[] = [];
  for (const p of catalog.products) {
    const key = norm(p.nombre);
    let score = 0;
    if (lower.includes(key)) score += 5;
    if (fuzzyIncludes(lower, key)) score += 3;
    const tokens = tokenize(p.nombre).filter(t => t.length > 3);
    for (const t of tokens) {
      if (lower.includes(t)) score += 2;
      else if (fuzzyIncludes(lower, t)) score += 1;
    }
    if (score > 0) scoredProducts.push({ item: p, score });
  }
  scoredProducts.sort((a, b) => b.score - a.score);
  const productosEncontrados = scoredProducts.slice(0, 5).map(p => p.item);

  return { raw, lower, tokens, v, label, catalog, serviciosEncontrados, productosEncontrados };
}

function serviciosCompatibles(services: ServiceItem[], v?: Vehiculo | null) {
  return services.filter((s: any) => !s.cotizar_local);
}

// ── Intent system ─────────────────────────────────────────────────

interface Intent {
  name: string;
  keywords: { word: string; weight: number }[];
  minScore: number;
  handler: (ctx: ChatContext) => string | null;
}

function scoreIntent(ctx: ChatContext, keywords: { word: string; weight: number }[]): number {
  let score = 0;
  for (const kw of keywords) {
    const w = kw.word;
    if (ctx.lower.includes(w)) {
      score += kw.weight;
    } else {
      for (const token of ctx.tokens) {
        if (fuzzyMatch(token, w) >= 0.75) { score += kw.weight * 0.7; break; }
      }
    }
  }
  return score;
}

function intentNegado(lower: string, intentName: string): boolean {
  const negaciones = ['no quiero', 'no necesito', 'no me interesa', 'no deseo', 'sin', 'solo quiero informacion', 'solo precio', 'solo quiero saber'];
  for (const neg of negaciones) {
    const idx = lower.indexOf(neg);
    if (idx === -1) continue;
    const fragmento = lower.slice(idx, idx + 50);
    if (intentName === 'agendar' && /agendar|cita|reservar|apartar/.test(fragmento)) return true;
    if (intentName === 'cotizacion' && /cotizar|precio|costo/.test(fragmento)) return true;
  }
  return false;
}

function vehiculoDesdeHistorial(history: ChatTurn[]): Vehiculo | undefined {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].vehiculo) return history[i].vehiculo;
    const detected = detectarVehiculo(history[i].text);
    if (detected) return detected;
  }
  return undefined;
}

function ultimaPreguntaBot(history: ChatTurn[]): string | null {
  const ultimoBot = [...history].reverse().find(t => t.role === 'bot');
  if (!ultimoBot) return null;
  const t = ultimoBot.text;
  if (t.includes('__SLOT__VEHICULO__')) return 'vehiculo';
  if (t.includes('__SLOT__SERVICIO__')) return 'servicio';
  if (t.includes('__SLOT__FECHA__')) return 'fecha';
  if (t.includes('__SLOT__PRODUCTO__')) return 'producto';
  if (t.includes('__SLOT__CONFIRMAR_CITA__')) return 'confirmar_cita';
  return null;
}

function formatHorarios(): string {
  const items = HORARIO_LINEA.map(h => `• ${h}`);
  return items.join('\n') + `\n\n⏰ *Puedes agendar en cualquiera de estos horarios, sujeto a disponibilidad.*`;
}

// ── Intents ───────────────────────────────────────────────────────

const INTENTS: Intent[] = [
  {
    name: 'saludo',
    keywords: [
      { word: 'hola', weight: 5 }, { word: 'buenas', weight: 5 }, { word: 'buenos', weight: 5 },
      { word: 'saludos', weight: 5 }, { word: 'hey', weight: 4 }, { word: 'buen dia', weight: 5 },
      { word: 'que mas', weight: 4 }, { word: 'q mas', weight: 4 }, { word: 'buenas tardes', weight: 5 },
      { word: 'buenas noches', weight: 5 }, { word: 'como estas', weight: 3 },
      { word: 'que tal', weight: 4 }, { word: 'que hay', weight: 3 },
      { word: 'muy buenas', weight: 4 }, { word: 'hola buenas', weight: 5 },
      { word: 'alo', weight: 3 }, { word: 'ola', weight: 3 },
    ],
    minScore: 4,
    handler: (ctx) => {
      const base = '¡Hola! Soy el asistente virtual de **Luxury Service Manga** 🚗✨ ¿En qué puedo ayudarte hoy?';
      if (!ctx.v) return base + '\n\nPara empezar, ¿qué tipo de vehículo tienes? __SLOT__VEHICULO__\n• 🚗 **Automóvil**\n• 🚙 **Camioneta**\n• 🏍️ **Moto**\n\nPuedes preguntarme por servicios, productos, horarios o agendar una cita directamente.';
      return base + `\n\nVeo que tienes **${ctx.label}** 🚗. Dime qué necesitas y con gusto te ayudo:\n\n• 🔧 **Servicios** — Ver todos los servicios disponibles para ${ctx.label}\n• 🛒 **Productos** — Lo que tenemos en tienda\n• 📅 **Agendar** — Apartar una cita\n• 💬 **Consultar** — Cualquier otra pregunta`;
    }
  },
  {
    name: 'despedida',
    keywords: [
      { word: 'adios', weight: 6 }, { word: 'chao', weight: 6 }, { word: 'bye', weight: 6 },
      { word: 'hasta luego', weight: 6 }, { word: 'nos vemos', weight: 6 }, { word: 'eso seria todo', weight: 5 },
      { word: 'gracias por tu', weight: 4 }, { word: 'gracias por su', weight: 4 }, { word: 'hasta pronto', weight: 6 },
      { word: 'que tengas buen', weight: 3 }, { word: 'feliz dia', weight: 3 }, { word: 'fue un placer', weight: 3 },
      { word: 'nos vemos luego', weight: 5 }, { word: 'cuídate', weight: 3 }, { word: 'cuidate', weight: 3 },
      { word: 'gracias adios', weight: 5 }, { word: 'muchas gracias adios', weight: 5 },
    ],
    minScore: 3,
    handler: () => '¡Hasta luego! 🙋‍♂️ Fue un placer atenderte. En **Luxury Service Manga** estamos siempre listos para ayudarte con tu vehículo 🚗✨\n\nRecuerda que puedes agendar tus citas en cualquier momento desde nuestra página web. ¡Cuídate y vuelve pronto!'
  },
  {
    name: 'ubicacion',
    keywords: [
      { word: 'donde', weight: 5 }, { word: 'ubicacion', weight: 6 }, { word: 'direccion', weight: 6 },
      { word: 'como llegar', weight: 6 }, { word: 'estan ubicados', weight: 6 },
      { word: 'mapa', weight: 5 }, { word: 'ubicado', weight: 5 }, { word: 'queda', weight: 4 },
      { word: 'sede', weight: 4 }, { word: 'local', weight: 3 }, { word: 'lugar', weight: 3 },
      { word: 'direccion exacta', weight: 6 }, { word: 'como llego', weight: 5 },
      { word: 'donde queda', weight: 5 }, { word: 'coordenadas', weight: 4 },
      { word: 'waze', weight: 4 }, { word: 'google maps', weight: 5 },
    ],
    minScore: 4,
    handler: () => '📍 **Luxury Service Manga** — **Cartagena, Colombia**\n\nEstamos en la **Av. Principal de Manga**, a una cuadra del parque principal. Fácil de encontrar y con espacio para tu vehículo.\n\n📌 Abrir en Google Maps: https://maps.google.com/?q=Manga,+Cartagena,+Colombia\n\n¿Necesitas el número para contactarnos o prefieres **agendar una cita** directamente desde aquí?'
  },
  {
    name: 'contacto',
    keywords: [
      { word: 'contacto', weight: 6 }, { word: 'telefono', weight: 6 }, { word: 'whatsapp', weight: 6 },
      { word: 'correo', weight: 5 }, { word: 'email', weight: 5 }, { word: 'llamar', weight: 5 },
      { word: 'celular', weight: 5 }, { word: 'asesor', weight: 5 }, { word: 'comunicar', weight: 5 },
      { word: 'numero', weight: 4 }, { word: 'escribir', weight: 4 },
      { word: 'numero de telefono', weight: 6 }, { word: 'hablar con un asesor', weight: 6 },
      { word: 'contactar', weight: 5 }, { word: 'comunicarme', weight: 5 },
      { word: 'correo electronico', weight: 5 }, { word: 'whats', weight: 4 }, { word: 'wp', weight: 4 },
      { word: 'atención al cliente', weight: 5 },
    ],
    minScore: 4,
    handler: () => '📬 **Puedes contactarnos por estos medios:**\n\n📞 **Teléfono:** +57 300 636 6429\n💬 **WhatsApp:** wa.me/573006366429\n✉️ **Correo:** luxury_admon@outlook.com\n\n⏰ **Horario de atención:** Lun–Sáb 7am–7pm, Dom 7am–2pm\n\n✅ También puedo **agendar una cita** para ti directamente desde aquí. Solo dime qué servicio necesitas.'
  },
  {
    name: 'horarios',
    keywords: [
      { word: 'horario', weight: 6 }, { word: 'hora', weight: 4 }, { word: 'cuando atienden', weight: 6 },
      { word: 'a que hora', weight: 5 }, { word: 'abren', weight: 5 }, { word: 'cierran', weight: 5 },
      { word: 'atienden', weight: 5 }, { word: 'abierto', weight: 4 },
      { word: 'horarios', weight: 6 }, { word: 'turno', weight: 4 }, { word: 'horario atencion', weight: 6 },
      { word: 'que horario tienen', weight: 5 }, { word: 'a que hora abren', weight: 5 },
      { word: 'dias de atencion', weight: 5 }, { word: 'que dias atienden', weight: 5 },
      { word: 'horario de atención', weight: 5 }, { word: 'horario laboral', weight: 4 },
    ],
    minScore: 4,
    handler: () => {
      return `🕐 **Horarios de atención:**\n• **Lunes a sábado:** 7:00 a.m. - 7:00 p.m.\n• **Domingo:** 7:00 a.m. - 2:00 p.m.\n\n**Horarios disponibles para citas:**\n${formatHorarios()}\n\n¿Te gustaría **agendar** una cita? Solo dime el servicio y la fecha.`;
    }
  },
  {
    name: 'agendar',
    keywords: [
      { word: 'agendar', weight: 6 }, { word: 'cita', weight: 5 }, { word: 'reservar', weight: 5 },
      { word: 'apartar', weight: 5 }, { word: 'turno', weight: 4 }, { word: 'programar', weight: 4 },
      { word: 'quiero una cita', weight: 6 }, { word: 'pedir cita', weight: 6 },
      { word: 'sacar cita', weight: 5 }, { word: 'quiero agendar', weight: 6 },
      { word: 'necesito cita', weight: 5 }, { word: 'quiero apartar', weight: 5 },
      { word: 'quiero reservar', weight: 5 }, { word: 'darme cita', weight: 4 },
      { word: 'agendame', weight: 5 }, { word: 'apartame', weight: 5 },
      { word: 'cita para servicio', weight: 5 }, { word: 'agendar servicio', weight: 5 },
      { word: 'registrar cita', weight: 5 }, { word: 'programar servicio', weight: 4 },
    ],
    minScore: 4,
    handler: (ctx) => {
      if (!ctx.v) return 'Claro, con gusto te ayudo a agendar una cita. Primero necesito saber: ¿tu vehículo es 🚗 **Automóvil**, 🚙 **Camioneta** o 🏍️ **Moto**? __SLOT__VEHICULO__';
      if (ctx.serviciosEncontrados.length > 0) {
        const s = ctx.serviciosEncontrados[0];
        return `📅 **Agendar: ${s.nombre}**\n\n${servicioDetalle(s, ctx.v)}\n\n¿Qué **fecha** te gustaría? Por ejemplo: *"mañana"*, *"15 de junio"*, *"este viernes"*. Te confirmaré disponibilidad. __SLOT__FECHA__`;
      }
      return '📅 Para agendar una cita, primero dime: ¿qué servicio necesitas? __SLOT__SERVICIO__\n\nPor ejemplo: *"lavado general"*, *"cambio de aceite"*, *"detailing completo"*, o *"polarizados"*.\n\nTambién puedo mostrarte la lista completa de servicios si me dices *"ver servicios"*.';
    }
  },
  {
    name: 'promociones',
    keywords: [
      { word: 'promocion', weight: 6 }, { word: 'descuento', weight: 6 }, { word: 'oferta', weight: 6 },
      { word: 'beneficio', weight: 4 }, { word: 'combo promocional', weight: 5 },
      { word: 'promo', weight: 5 }, { word: 'combos', weight: 4 },
      { word: 'plan', weight: 3 }, { word: 'paquete', weight: 3 }, { word: 'rebaja', weight: 4 },
      { word: 'precio especial', weight: 4 }, { word: 'pack', weight: 3 },
      { word: 'que promocion', weight: 4 }, { word: 'hay descuento', weight: 4 },
    ],
    minScore: 4,
    handler: () => '🎉 **Promociones y ofertas:**\n\nActualmente tenemos combos especiales en lavado + detailing y promociones en nuestros servicios de mecánica básica.\n\n💡 *Para conocer las promociones vigentes y precios actualizados, visita nuestra página web o la tienda física en Manga.*\n\n¿Te gustaría conocer los **servicios** disponibles o prefieres **agendar** una cita? Puedo ayudarte con ambas.'
  },
  {
    name: 'agradecimiento',
    keywords: [
      { word: 'gracias', weight: 6 }, { word: 'perfecto', weight: 4 }, { word: 'ok', weight: 3 },
      { word: 'listo', weight: 4 }, { word: 'genial', weight: 4 }, { word: 'excelente', weight: 4 },
      { word: 'de acuerdo', weight: 4 }, { word: 'muy bien', weight: 4 }, { word: 'super', weight: 3 },
      { word: 'vale', weight: 3 }, { word: 'entendido', weight: 4 }, { word: 'claro', weight: 3 },
      { word: 'muchas gracias', weight: 6 }, { word: 'gracias por la info', weight: 5 },
      { word: 'te agradezco', weight: 4 }, { word: 'gracias por tu ayuda', weight: 5 },
      { word: 'mil gracias', weight: 5 },
    ],
    minScore: 3,
    handler: () => '¡Con gusto! 😊 Para eso estoy — para ayudarte con lo que necesites.\n\n¿Hay algo más en que pueda servirte? ¿Quieres **agendar** una cita o te gustaría ver nuestros **servicios**?'
  },
  {
    name: 'cotizacion',
    keywords: [
      { word: 'cotizar', weight: 6 }, { word: 'cotizacion', weight: 6 }, { word: 'presupuesto', weight: 6 },
      { word: 'cuanto vale', weight: 5 }, { word: 'cuanto cuesta', weight: 5 }, { word: 'cuanto cobran', weight: 5 },
      { word: 'precio tiene', weight: 5 }, { word: 'tarifa', weight: 5 },
      { word: 'precio', weight: 4 }, { word: 'precios', weight: 4 },
      { word: 'costo', weight: 4 }, { word: 'costos', weight: 4 }, { word: 'quiero cotizar', weight: 6 },
      { word: 'cotizame', weight: 5 }, { word: 'cotiza', weight: 5 },
      { word: 'que precio tiene', weight: 5 }, { word: 'cuanto sale el servicio', weight: 5 },
      { word: 'precios servicios', weight: 5 }, { word: 'lista de precios', weight: 5 },
      { word: 'me das un precio', weight: 5 }, { word: 'quiero un presupuesto', weight: 5 },
    ],
    minScore: 4,
    handler: (ctx) => {
      const disclaimer = '\n\n💡 *Los precios y promociones actualizados los encuentras en nuestra página web en la sección de servicios, o directamente en la tienda física.*';
      if (!ctx.v) return 'Para ayudarte con los precios necesito saber: ¿tu vehículo es 🚗 **Automóvil**, 🚙 **Camioneta** o 🏍️ **Moto**? __SLOT__VEHICULO__' + disclaimer;
      if (ctx.serviciosEncontrados.length > 0) {
        const lines = ctx.serviciosEncontrados.map(s => {
          return `• **${s.nombre}** — ⏱ ${s.duracion_minutos} min${s.descripcion ? `\n  📝 ${s.descripcion.slice(0, 80)}${s.descripcion.length > 80 ? '…' : ''}` : ''}`;
        });
        return `📋 **Servicios para ${ctx.label}:**\n\n${lines.join('\n')}\n\n¿Te gustaría **agendar** alguno? Solo dime el nombre. __SLOT__SERVICIO__` + disclaimer;
      }
      const disponibles = serviciosCompatibles(ctx.catalog.services, ctx.v);
      if (disponibles.length === 0) return 'En este momento no tengo servicios registrados para tu vehículo.' + disclaimer;
      let out = `📋 **SERVICIOS DISPONIBLES para ${ctx.label}:**\n\n`;
      const categorias = new Map<string, ServiceItem[]>();
      for (const s of disponibles) {
        const cat = s.categoria || 'OTROS';
        if (!categorias.has(cat)) categorias.set(cat, []);
        categorias.get(cat)!.push(s);
      }
      for (const [cat, items] of categorias) {
        out += `**${cat}:**\n`;
        out += items.slice(0, 5).map(s => formatoServicio(s, ctx.v)).join('\n') + '\n\n';
      }
      out += '¿Te gustaría agendar alguno? Dime el nombre del servicio. __SLOT__SERVICIO__' + disclaimer;
      return out;
    }
  },
  {
    name: 'servicios',
    keywords: [
      { word: 'servicios', weight: 6 }, { word: 'servicio', weight: 5 }, { word: 'catalogo', weight: 5 },
      { word: 'mantenimiento', weight: 4 }, { word: 'que servicios', weight: 6 },
      { word: 'que ofrecen', weight: 5 }, { word: 'servicios tienen', weight: 5 },
      { word: 'trabajan', weight: 3 }, { word: 'portafolio', weight: 3 },
      { word: 'tipos de', weight: 4 }, { word: 'hay disponible', weight: 4 },
      { word: 'cuales son los servicios', weight: 5 }, { word: 'que servicios prestan', weight: 5 },
      { word: 'servicios disponibles', weight: 4 },
    ],
    minScore: 4,
    handler: (ctx) => {
      const disponibles = serviciosCompatibles(ctx.catalog.services, ctx.v);
      if (disponibles.length === 0) return 'No hay servicios disponibles en este momento.';
      let out = `📋 **SERVICIOS LUXURY SERVICE MANGA**${ctx.v ? ` (${ctx.label})` : ''}:\n`;
      const categorias = new Map<string, ServiceItem[]>();
      for (const s of disponibles) {
        const cat = s.categoria || 'OTROS';
        if (!categorias.has(cat)) categorias.set(cat, []);
        categorias.get(cat)!.push(s);
      }
      for (const [cat, items] of categorias) {
        out += `\n**${cat.toUpperCase()}:**\n`;
        out += items.slice(0, 8).map(s => formatoServicio(s, ctx.v)).join('\n');
        if (items.length > 8) out += `\n... y ${items.length - 8} más`;
      }
      out += '\n\n¿Te gustaría **agendar** alguno? Dime el nombre y te ayudo.';
      return out;
    }
  },
  {
    name: 'productos',
    keywords: [
      { word: 'producto', weight: 6 }, { word: 'productos', weight: 6 }, { word: 'tienda', weight: 5 },
      { word: 'comprar', weight: 5 }, { word: 'stock', weight: 4 }, { word: 'articulo', weight: 4 },
      { word: 'venden', weight: 4 }, { word: 'que productos', weight: 4 },
      { word: 'que venden', weight: 4 }, { word: 'tienen productos', weight: 4 },
      { word: 'catalogo de productos', weight: 5 },
      { word: 'aceite', weight: 3 }, { word: 'filtro', weight: 3 }, { word: 'llanta', weight: 3 },
    ],
    minScore: 4,
    handler: (ctx) => {
      if (ctx.catalog.products.length === 0) return 'Actualmente no tenemos productos disponibles en tienda. ¿Quieres consultar nuestros **servicios**?';

      if (ctx.productosEncontrados.length > 0) {
        const lines = ctx.productosEncontrados.map(p => {
          const stock = p.stock > 0 ? `✅ ${p.stock} und. disponibles` : '❌ Agotado temporalmente';
          const desc = p.descripcion ? `\n   ${p.descripcion.slice(0, 80)}${p.descripcion.length > 80 ? '…' : ''}` : '';
          return `• **${p.nombre}** — ${stock}${desc}`;
        });
        return `🛒 **Productos:**\n${lines.join('\n')}\n\n💡 *Para ver precios y comprar, ingresa a la sección **Tienda** en nuestra página web con tu correo registrado.*\n\n¿Necesitas algo más?`;
      }

      const prodCatMatch = matchProductCategory(ctx.lower, ctx.catalog.products);
      if (prodCatMatch) {
        let out = `🛒 **${prodCatMatch.category}** — Productos:\n\n`;
        out += prodCatMatch.items.slice(0, 8).map(p => {
          const stock = p.stock > 0 ? `✅ ${p.stock} und.` : '❌ Agotado';
          return `• **${p.nombre}** (${stock})`;
        }).join('\n');
        if (prodCatMatch.items.length > 8) out += `\n... y ${prodCatMatch.items.length - 8} productos más`;
        out += '\n\n💡 *Para precios y compra, visita la **Tienda** en nuestra web con tu correo.*\n\n¿Buscas algo en particular?';
        return out;
      }

      const catMap = new Map<string, ProductItem[]>();
      for (const p of ctx.catalog.products) {
        const cat = p.categoria || 'OTROS';
        if (!catMap.has(cat)) catMap.set(cat, []);
        catMap.get(cat)!.push(p);
      }
      let out = '🛒 **Catálogo de productos:**\n\n';
      for (const [cat, items] of catMap) {
        out += `**${cat}:**\n`;
        out += items.slice(0, 5).map(p => {
          const desc = p.descripcion ? ` — ${p.descripcion.slice(0, 50)}${p.descripcion.length > 50 ? '…' : ''}` : '';
          return `• ${p.nombre}${desc} (${p.stock > 0 ? `${p.stock} disp.` : 'agotado'})`;
        }).join('\n') + '\n\n';
      }
      out += '💡 *Para precios y compra, visita la **Tienda** en nuestra web con tu correo.*\n\n¿Te interesa alguna categoría en especial?';
      return out;
    }
  },
  {
    name: 'vehiculo_solo',
    keywords: [
      { word: 'automovil', weight: 3 }, { word: 'camioneta', weight: 3 }, { word: 'moto', weight: 3 },
      { word: 'carro', weight: 3 }, { word: 'auto', weight: 3 }, { word: 'vehiculo', weight: 2 },
      { word: 'motocicleta', weight: 3 }, { word: '4x4', weight: 2 }, { word: 'suv', weight: 2 },
    ],
    minScore: 3,
    handler: (ctx) => {
      const msgWords = ctx.lower.split(/\s+/).filter(Boolean);
      if (msgWords.length > 4) return null;
      if (!ctx.v) return '¿Tu vehículo es 🚗 **Automóvil**, 🚙 **Camioneta** o 🏍️ **Moto**? __SLOT__VEHICULO__';
      const disponibles = serviciosCompatibles(ctx.catalog.services, ctx.v);
      return `¡Perfecto! Has seleccionado **${ctx.label}** 🚗.\n\nPuedo ayudarte con:\n• Ver **servicios** (${disponibles.length} disponibles)\n• **Cotizar** un servicio\n• **Agendar** una cita\n\n¿Qué deseas consultar?`;
    }
  },
];

// ── Category & Product matching ──────────────────────────────────

const CATEGORIA_MAP: [RegExp, string[]][] = [
  [/\b(lavados?|hidroblast|chasis|vapores?|encerados?|combos?|express|generales?|espumas?|enjuagues?|lavar|limpieza exterior|limpiar|lavada|lavadero|aseo|enjuagar|lavo)/, ['Servicios Básicos', 'Combos', 'Lavado']],
  [/\b(alineacion|balanceo|llantas?|suspension|faros?|direccion|amortiguadores?|ruedas?|cauchos?|neumaticos?|rines?|vibracion|volante|alinear|balancear)/, ['Alineación y Balanceo', 'Llantas']],
  [/\b(frenos?|pastillas?|bandas?|liquido de freno|calipers?|discos?|frenado|frenar|pastilla freno|disco freno)/, ['Mantenimiento de Frenos']],
  [/\b(lubric|cambio de aceite|cambio aceite|filtros?|aceites?|engrases?|cambiar aceite|cambiar filtro|aceite motor)/, ['Lubricación']],
  [/\b(detailing|pulidos?|ceramicos?|nano|rayon|tapicer|luxury|detallados?|brillos?|ceras?|encerados?|pulir|abrillantar|detallar|detalle|acabado|embellecer|restauracion)/, ['Servicios Detailing', 'Detailing']],
  [/\b(anticorrosiv|cabinas?|pinturas?|agua caliente|cavidades?|oxido|herrumbre|corrosion|protectores?)/, ['Servicios Anticorrosivos']],
  [/\b(polarizados?|polarizacion|vidrios?|peliculas?|polarizar|polarizad|opacos?|film|oscurecer|blackout)/, ['Polarizados']],
  [/\b(pinturas?|pintar|latoneria|latas|enderezada|chapista|carroceria|enderezar|pintura completa|repintar|retocar|color|pintar vehiculo)/, ['Servicios de Pintura', 'Pintura']],
  [/\b(diagnosti|scan|computador|escaneo|electr|fallas?|test|revisar|comprobar|chequeos?|check|revision general)/, ['Diagnóstico']],
  [/\b(proteccion|protect|ceramico|selladores?|protectores?)/, ['Protección']],
  [/\b(adicionales?|extra|accesorios?|complementos?)/, ['Adicionales']],
  [/\b(farolas?|faros?|luz|iluminacion|optic|iluminar)/, ['Farolas']],
];

function matchProductCategory(text: string, products: ProductItem[]): { category: string; items: ProductItem[] } | null {
  const cats = new Map<string, ProductItem[]>();
  for (const p of products) {
    const cat = p.categoria || 'OTROS';
    if (!cats.has(cat)) cats.set(cat, []);
    cats.get(cat)!.push(p);
  }
  const t = norm(text);
  for (const [cat, items] of cats) {
    const catLower = norm(cat);
    if (t.includes(catLower)) return { category: cat, items };
    const catTokens = tokenize(cat);
    const matchedTokens = catTokens.filter(ct => t.includes(ct) || fuzzyIncludes(t, ct, 0.7));
    if (matchedTokens.length >= catTokens.length * 0.6) return { category: cat, items };
  }
  const CAT_SYNONYMS: Record<string, string[]> = {
    'ACEITES': ['aceite', 'aceites', 'lubricante', 'lubricantes', 'oil', 'mobil', 'chevron', 'havoline', 'shell'],
    'FILTRO DE ACEITE': ['filtro aceite', 'filtro de aceite', 'filtros aceite', 'oil filter', 'filtro aceitera'],
    'FILTROS DE AIRE': ['filtro aire', 'filtro de aire', 'filtros aire', 'air filter'],
    'LLANTAS': ['llanta', 'llantas', 'neumatico', 'neumaticos', 'caucho', 'cauchos', 'rueda', 'ruedas'],
    'PLUMILLAS': ['plumilla', 'plumillas', 'limpiaparabrisas', 'wiper', 'limpia'],
    'XTODOS': ['xtodos', 'todo terreno', '4x4', 'accesorios'],
  };
  for (const [cat, synonyms] of Object.entries(CAT_SYNONYMS)) {
    if (synonyms.some(s => t.includes(s) || fuzzyIncludes(t, s, 0.7))) {
      const items = cats.get(cat);
      if (items && items.length > 0) return { category: cat, items };
    }
  }
  return null;
}

// ── Slot helpers ─────────────────────────────────────────────────

function parseFecha(texto: string): string | null {
  const t = norm(texto);
  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

  if (t.includes('hoy') || t.includes('ahora')) return toIso(today);
  if (t.includes('mañana') || t.includes('manana')) return toIso(tomorrow);
  if (t.includes('pasado mañana') || t.includes('pasado manana')) {
    const d = new Date(today); d.setDate(d.getDate() + 2);
    return toIso(d);
  }

  const meses: Record<string, number> = {
    'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
    'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11,
    'ene': 0, 'feb': 1, 'mar': 2, 'abr': 3, 'may': 4, 'jun': 5,
    'jul': 6, 'ago': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dic': 11
  };

  // "15 de junio" or "15 junio"
  const diaMes = t.match(/(\d{1,2})\s*de?\s*([a-záéíóú]+)/i);
  if (diaMes) {
    const dia = parseInt(diaMes[1]);
    const mes = meses[norm(diaMes[2])];
    if (mes !== undefined && dia >= 1 && dia <= 31) {
      const d = new Date(today.getFullYear(), mes, dia);
      if (d >= today) return toIso(d);
      d.setFullYear(d.getFullYear() + 1);
      return toIso(d);
    }
  }

  // "lunes", "martes", etc.
  const diasSemana: Record<string, number> = {
    'domingo': 0, 'lunes': 1, 'martes': 2, 'miercoles': 3, 'jueves': 4, 'viernes': 5, 'sabado': 6
  };
  for (const [name, dayIndex] of Object.entries(diasSemana)) {
    if (t.includes(name)) {
      const d = new Date(today);
      d.setDate(d.getDate() + ((dayIndex + 7 - d.getDay()) % 7));
      if (d <= today) d.setDate(d.getDate() + 7);
      return toIso(d);
    }
  }

  // YYYY-MM-DD
  const isoMatch = t.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return isoMatch[0];

  return null;
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseHorario(texto: string): string | null {
  const t = norm(texto);
  // "8", "8:00", "8 am", "8:00 am", "8 a.m."
  const match = t.match(/(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/);
  if (!match) return null;
  let h = parseInt(match[1]);
  const m = match[2] ? parseInt(match[2]) : 0;
  const ampm = match[3];
  if (ampm?.startsWith('p') && h < 12) h += 12;
  if (ampm?.startsWith('a') && h === 12) h = 0;
  if (h < 8 || h > 18) return null;
  if (m !== 0) return null;
  return `${String(h).padStart(2, '0')}:00`;
}

// ── Appointment helpers ──────────────────────────────────────────

async function verificarDisponibilidad(servicioId: string, fecha: string): Promise<string[]> {
  try {
    const db = getDb();
    const ocupados = await db.collection('citas').find({
      fecha,
      servicio_id: new ObjectId(servicioId),
      estado: { $ne: 'cancelada' }
    }).toArray();
    const set = new Set(ocupados.map(c => c.horario));
    return HORARIOS.filter(h => !set.has(h)) as unknown as string[];
  } catch {
    return HORARIOS as unknown as string[];
  }
}

async function crearCita(datos: {
  servicioId: string;
  fecha: string;
  horario: string;
  tipoVehiculo: string;
  email: string;
  nombre: string;
}): Promise<{ ok: boolean; error?: string; ticket?: string }> {
  try {
    const db = getDb();
    const existing = await db.collection('citas').findOne({
      fecha: datos.fecha,
      horario: datos.horario,
      servicio_id: new ObjectId(datos.servicioId),
      estado: { $ne: 'cancelada' }
    });
    if (existing) return { ok: false, error: 'Ese horario ya está ocupado. Por favor elige otro.' };

    const servicio = await db.collection('servicios').findOne({ _id: new ObjectId(datos.servicioId) });
    if (!servicio) return { ok: false, error: 'Servicio no encontrado.' };

    const user = await db.collection('usuarios').findOne({ email: datos.email });
    if (!user) return { ok: false, error: 'Debes tener una cuenta con tu correo para agendar.' };

    const ticket = generateTicket();
    await db.collection('citas').insertOne({
      servicio_id: new ObjectId(datos.servicioId),
      fecha: datos.fecha,
      horario: datos.horario,
      tipo_vehiculo: datos.tipoVehiculo,
      email: datos.email,
      nombre: datos.nombre,
      ticket,
      estado: 'pendiente',
      created_at: new Date()
    });
    return { ok: true, ticket };
  } catch (err) {
    return { ok: false, error: 'Error al crear la cita. Intenta de nuevo.' };
  }
}

let ticketCounter = 0;

function generateTicket(): string {
  const prefix = 'LS';
  const ts = Date.now().toString(36).toUpperCase().slice(-4);
  ticketCounter = (ticketCounter + 1) % 9999;
  const seq = String(ticketCounter).padStart(4, '0');
  const buf = new Uint8Array(2);
  crypto.getRandomValues?.(buf);
  const rand = buf ? Array.from(buf, b => b.toString(16).toUpperCase()).join('') : 'ZZ';
  return `${prefix}-${ts}${seq}${rand}`;
}

// ── Main reply builder ───────────────────────────────────────────

export async function buildChatbotReply(
  message: string,
  history: ChatTurn[] = [],
  vehiculoExplicito?: Vehiculo,
  userEmail?: string,
  userName?: string
): Promise<string> {
  const catalog = await getCatalog();

  const vehiculoDetectadoMensaje = detectarVehiculo(message);
  const vehiculoHeredado: Vehiculo | undefined =
    vehiculoExplicito ??
    vehiculoDetectadoMensaje ??
    vehiculoDesdeHistorial(history) ??
    undefined;

  const ctx = buildContext(message, vehiculoHeredado, catalog);

  // ── SLOT FILLING ────────────────────────────────────────────────
  const preguntaPendiente = ultimaPreguntaBot(history);

  if (preguntaPendiente === 'vehiculo' && ctx.v) {
    const disponibles = serviciosCompatibles(catalog.services, ctx.v);
    const prodCount = catalog.products.length;
    let out = `¡Perfecto! **${ctx.label}** 🚗 — excelente elección.\n\n`;
    out += `📋 **Para ${ctx.label}** tenemos:\n`;
    out += `• 🔧 **${disponibles.length} servicios** disponibles\n`;
    out += `• 🛒 **${prodCount} productos** en tienda\n\n`;
    out += '¿Qué deseas hacer?\n• **Ver servicios** — Mostrar lista completa\n• **Agendar** — Apartar una cita\n• **Productos** — Ver lo que tenemos en tienda\n• O pregúntame lo que necesites.';
    return out;
  }

  if (preguntaPendiente === 'servicio' && ctx.serviciosEncontrados.length > 0) {
    const s = ctx.serviciosEncontrados[0];
    return `📅 **Agendar: ${s.nombre}**\n\n${servicioDetalle(s, ctx.v)}\n\n¿Qué **fecha** prefieres? Puedes decirme por ejemplo: *"mañana"*, *"15 de junio"*, *"este sábado"*. __SLOT__FECHA__`;
  }

  // Fecha slot: check availability
  if (preguntaPendiente === 'fecha') {
    const fecha = parseFecha(message);
    if (!fecha) return 'No entendí bien la fecha. ¿Puedes repetirla? Por ejemplo: *"mañana"*, *"15 de junio"*, *"este lunes"*. __SLOT__FECHA__';

    const ultimoMensajeBuscando = [...history].reverse().find(t => t.role === 'user');
    const ctxForService = ultimoMensajeBuscando ? buildContext(ultimoMensajeBuscando.text, vehiculoHeredado, catalog) : ctx;
    const servicio = ctxForService.serviciosEncontrados[0] || ctx.serviciosEncontrados[0];
    if (!servicio) return `Entendido, **${fecha}**. Pero no me quedó claro el servicio. ¿Puedes decirme cuál necesitas? Por ejemplo: lavado, detailing, cambio de aceite. __SLOT__SERVICIO__`;

    const serviceId = (servicio as any)._id;
    if (!serviceId) return `Entendido, **${fecha}**. No puedo verificar disponibilidad para ese servicio desde aquí. Te recomiendo agendar directamente en nuestra página web.`;

    const disponibles = await verificarDisponibilidad(serviceId, fecha);
    if (disponibles.length === 0) return `Lo siento, no hay horarios disponibles para el **${fecha}**. ¿Podrías elegir otra fecha? __SLOT__FECHA__`;

    return `✅ Hay **${disponibles.length} horarios** disponibles el **${fecha}**:\n\n${disponibles.map(h => `• ${HORARIO_LABELS[h] || h}`).join('\n')}\n\n¿Qué hora prefieres? __SLOT__CONFIRMAR_CITA__`;
  }

  // Confirmar cita: process the booking
  if (preguntaPendiente === 'confirmar_cita') {
    if (!userEmail) return 'Para agendar la cita necesito tu **correo electrónico**. Escríbelo por favor 📧';

    const horarioElegido = parseHorario(message);
    if (!horarioElegido) {
      return 'No entendí la hora. Los horarios disponibles son:\n\n' + formatHorarios() + '\n\n¿Qué hora prefieres? Por ejemplo: *"10:00"*, *"2 pm"*, *"9 de la mañana"*. __SLOT__CONFIRMAR_CITA__';
    }

    // Get fecha and servicio from conversation
    const historialTextos = history.filter(t => t.role === 'bot').map(t => t.text);
    let fecha = '';
    let servicio: ServiceItem | null = null;

    // Extract fecha from bot messages
    for (const t of historialTextos) {
      const match = t.match(/(\d{4}-\d{2}-\d{2})/);
      if (match) { fecha = match[1]; break; }
    }
    // If not found, try user messages
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].role === 'user') {
        const parsed = parseFecha(history[i].text);
        if (parsed) { fecha = parsed; break; }
      }
    }
    if (!fecha) return 'Disculpa, perdí la fecha. ¿Puedes decirla de nuevo? __SLOT__FECHA__';

    // Get servicio from last service mentions
    const allTexts = history.filter(t => t.role === 'user').map(t => t.text).concat(message);
    for (const txt of allTexts) {
      const c = buildContext(txt, ctx.v, catalog);
      if (c.serviciosEncontrados.length > 0) { servicio = c.serviciosEncontrados[0]; break; }
    }
    if (!servicio) servicio = ctx.serviciosEncontrados[0];
    if (!servicio) return 'Disculpa, no recuerdo el servicio. ¿Cuál necesitas? __SLOT__SERVICIO__';

    const serviceId = (servicio as any)._id;
    if (!serviceId) return 'No puedo agendar ese servicio por chat. Por favor agenda en la web.';

    const disponibles = await verificarDisponibilidad(serviceId, fecha);
    if (!disponibles.includes(horarioElegido)) {
      return `Ese horario no está disponible o ya fue tomado. Horarios disponibles para esa fecha:\n\n${disponibles.map(h => `• ${HORARIO_LABELS[h] || h}`).join('\n')}\n\n¿Cuál prefieres? __SLOT__CONFIRMAR_CITA__`;
    }

    const tipo = ctx.v || 'auto';
    const nombre = userName || userEmail;

    const result = await crearCita({
      servicioId: serviceId,
      fecha,
      horario: horarioElegido,
      tipoVehiculo: tipo,
      email: userEmail,
      nombre
    });

    if (!result.ok) return `❌ ${result.error || 'No se pudo agendar la cita.'}`;

    return `✅ **¡Cita agendada con éxito!** 🎉\n\n📋 **Resumen de tu cita:**\n• **Servicio:** ${servicio.nombre}\n• **Vehículo:** ${ctx.label || 'Automóvil'}\n• **Fecha:** ${fecha}\n• **Hora:** ${HORARIO_LABELS[horarioElegido] || horarioElegido}\n• **Ticket:** ${result.ticket}\n\n📩 Te enviaremos los detalles a tu correo.\n🙏 ¡Gracias por confiar en **Luxury Service Manga**!\n\n¿Necesitas algo más? Estoy aquí para ayudarte.`;
  }

  if (preguntaPendiente === 'producto' && ctx.productosEncontrados.length > 0) {
    const p = ctx.productosEncontrados[0];
    const stock = p.stock > 0 ? `✅ ${p.stock} unidades disponibles` : '❌ Agotado por el momento';
    return `🛒 **${p.nombre}**\n📝 ${p.descripcion}\n📦 Stock: ${stock}\n\n💡 *Para conocer el precio y realizar tu compra, ingresa a la sección **Tienda** en nuestra página web con tu correo registrado.*\n\n¿Necesitas algo más?`;
  }

  // ── INTENT DETECTION ────────────────────────────────────────────
  let best: { intent: Intent; score: number } | null = null;

  for (const intent of INTENTS) {
    if (intent.name === 'servicio_especifico') continue;
    if (intentNegado(ctx.lower, intent.name)) continue;
    const score = scoreIntent(ctx, intent.keywords);
    if (score >= intent.minScore && (!best || score > best.score)) {
      best = { intent, score };
    }
  }

  if (best) {
    const reply = best.intent.handler(ctx);
    if (reply) return reply;
  }

  // ── FALLBACKS ───────────────────────────────────────────────────

  if (ctx.serviciosEncontrados.length > 0) {
    if (ctx.serviciosEncontrados.length === 1) {
      const s = ctx.serviciosEncontrados[0];
      return `${servicioDetalle(s, ctx.v)}\n\n¿Te gustaría **agendar** este servicio? Solo dime la fecha.`;
    }
    const lines = ctx.serviciosEncontrados.map(s => formatoServicio(s, ctx.v));
    return `Encontré estos servicios:\n${lines.join('\n')}\n\n¿Cuál te gustaría agendar? Dime el nombre.`;
  }

  let catMatch: string[] | null = null;
  for (const [pattern, cats] of CATEGORIA_MAP) {
    if (pattern.test(ctx.lower)) { catMatch = cats; break; }
  }
  if (catMatch) {
    const disponibles = serviciosCompatibles(catalog.services, ctx.v);
    const items = disponibles.filter(s => catMatch!.includes(s.categoria || ''));
    if (items.length > 0) {
      const lines = items.map(s => formatoServicio(s, ctx.v));
      return `🔧 **${items[0].categoria?.toUpperCase() || 'SERVICIOS'}**${ctx.label ? ` (${ctx.label})` : ''}:\n${lines.join('\n')}\n\n¿Te gustaría agendar alguno? Dime cuál.`;
    }
  }

  if (ctx.productosEncontrados.length > 0) {
    const lines = ctx.productosEncontrados.map(p => {
      const stock = p.stock > 0 ? `✅ ${p.stock} und.` : '❌ Agotado';
      const desc = p.descripcion ? `\n   ${p.descripcion.slice(0, 60)}${p.descripcion.length > 60 ? '…' : ''}` : '';
      return `• **${p.nombre}** (${stock})${desc}`;
    });
    return `🛒 **Productos:**\n${lines.join('\n')}\n\n💡 *Para ver precios y comprar, visita la **Tienda** en nuestra web con tu correo.* ¿Necesitas algo más?`;
  }

  const prodCatMatch = matchProductCategory(ctx.lower, catalog.products);
  if (prodCatMatch) {
    let out = `🛒 **${prodCatMatch.category}** — Productos:\n\n`;
    out += prodCatMatch.items.slice(0, 8).map(p => {
      return `• **${p.nombre}** — ${p.stock > 0 ? `${p.stock} und.` : 'agotado'}`;
    }).join('\n');
    if (prodCatMatch.items.length > 8) out += `\n... y ${prodCatMatch.items.length - 8} productos más`;
    out += '\n\n💡 *Para precios y compra, visita la **Tienda** en nuestra web.* ¿Buscas algo en particular?';
    return out;
  }

  const detectedCategory = Object.entries(SINONIMOS_SERVICIOS).find(([_, words]) =>
    words.some(w => ctx.lower.includes(w) || fuzzyIncludes(ctx.lower, w))
  );
  if (detectedCategory) {
    const disponibles = serviciosCompatibles(catalog.services, ctx.v);
    const items = disponibles.filter(s => s.categoria === detectedCategory[0] || norm(s.nombre).includes(norm(detectedCategory[0])));
    if (items.length > 0) {
      const lines = items.map(s => formatoServicio(s, ctx.v));
      return `🔧 **${detectedCategory[0].toUpperCase()}**${ctx.label ? ` (${ctx.label})` : ''}:\n${lines.join('\n')}\n\n¿Te gustaría agendar alguno? Dime cuál.`;
    }
  }

  // ── SMART FALLBACK ──────────────────────────────────────────────

  // Product mention via fuzzy
  const prodMention = ctx.tokens.some(t => {
    return catalog.products.some(p => {
      const pt = tokenize(p.nombre);
      return pt.some(ptt => fuzzyMatch(t, ptt) >= 0.6);
    });
  });
  if (prodMention) {
    const cerca = catalog.products.filter(p =>
      ctx.tokens.some(t => tokenize(p.nombre).some(ptt => fuzzyMatch(t, ptt) >= 0.6))
    ).slice(0, 5);
    if (cerca.length > 0) {
      const lines = cerca.map(p => `• **${p.nombre}** — ${p.stock > 0 ? `${p.stock} disp.` : 'agotado'}`);
      return `¿Buscas algún producto? Encontré estos:\n${lines.join('\n')}\n\n💡 *Para precios y compra, visita la **Tienda** en nuestra web.* ¿Te gusta alguno?`;
    }
  }

  const serviciosCercanos = catalog.services.filter(s =>
    ctx.tokens.some(t => {
      const st = tokenize(s.nombre);
      return st.some(stt => fuzzyMatch(t, stt) >= 0.55);
    })
  ).slice(0, 3);

  if (serviciosCercanos.length > 0) {
    const nombres = serviciosCercanos.map(s => `**${s.nombre}**`).join(', ');
    return `¿Te refieres a alguno de estos servicios? ${nombres}\n\nCuéntame con más detalle o dime si quieres **agendar** alguno. 😊`;
  }

  if (ctx.v) {
    const disponibles = serviciosCompatibles(catalog.services, ctx.v);
    return `Tienes **${ctx.label}** 🚗. ¿Qué necesitas?\n\n• 🔧 **Servicios** (${disponibles.length} disponibles)\n• 🛒 **Productos** en tienda\n• 📅 **Agendar** una cita\n• 💬 **Otra consulta**\n\nDime cómo puedo ayudarte.`;
  }

  const sugerencias: string[] = [];
  if (/\b(servicio|hacen|ofrecen|trabajan|producto|lavado|detailing|mecanic|pintur|aceite|filtro|llanta)\b/.test(ctx.lower)) sugerencias.push('ver los **servicios**');
  if (/\b(agendar|cita|turno|reserv|apartar|programar)\b/.test(ctx.lower)) sugerencias.push('**agendar una cita**');
  if (/\b(horario|hora|atienden|abren|abierto)\b/.test(ctx.lower)) sugerencias.push('consultar **horarios**');
  if (/\b(producto|comprar|tienda|articulo|precio|aceite|filtro|llanta|bujia)\b/.test(ctx.lower)) sugerencias.push('ver **productos**');
  if (/\b(ubicacion|direccion|donde|mapa|como llegar)\b/.test(ctx.lower)) sugerencias.push('saber la **ubicación**');
  if (/\b(contacto|telefono|whatsapp|correo|llamar)\b/.test(ctx.lower)) sugerencias.push('los datos de **contacto**');

  if (sugerencias.length > 0) {
    return `Disculpa, no entendí completamente tu mensaje. ¿Quieres ${sugerencias.join(' o ')}?\n\nPara empezar, dime: ¿tu vehículo es 🚗 **Automóvil**, 🚙 **Camioneta** o 🏍️ **Moto**? __SLOT__VEHICULO__`;
  }

  return '¡Hola! Soy el asistente de **Luxury Service Manga** 🚗✨ Puedo ayudarte con:\n\n• 🔧 **Servicios** — Lavado, detailing, mecánica, pintura y más\n• 🛒 **Productos** — Aceites, filtros, llantas y accesorios\n• 📅 **Agendar** una cita\n• 📍 **Ubicación** y **contacto**\n\nPara empezar, ¿tu vehículo es 🚗 **Automóvil**, 🚙 **Camioneta** o 🏍️ **Moto**? __SLOT__VEHICULO__';
}

export function invalidateChatbotCache() {
  cache = null;
}
