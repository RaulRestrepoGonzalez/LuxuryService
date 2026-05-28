import { getDb } from './db.js';

export const HORARIOS_LABEL = ['10:00 a.m.', '2:00 p.m.'] as const;
export const HORARIOS = ['10:00', '14:00'] as const;

export type Vehiculo = 'auto' | 'camioneta' | 'moto';

export interface ChatTurn {
  role: 'user' | 'bot';
  text: string;
  vehiculo?: Vehiculo;
  intent?: string;
}

interface CatalogCache {
  services: { nombre: string; descripcion: string; duracion_minutos: number; categoria?: string; cotizar_local?: boolean }[];
  products: { nombre: string; descripcion: string; stock: number; categoria?: string }[];
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
      db.collection('servicios').find({ activo: true }).project({ nombre: 1, descripcion: 1, duracion_minutos: 1, categoria: 1, cotizar_local: 1 }).toArray(),
      db.collection('productos').find({ nombre: { $not: /\b(CAFE|CAFÉ|TINTO|CAPUCCINO|CAPUCHINO|COCOSET|COCOSETTE|ABUELITA|NESCAFE|LATTES|LATTE|CHOCOLATE|CERVEZA|GASEOSA|GATORADE|JUGO|GALLETA|CHIPS|CHEETOS|DORITOS|DETODITO|FRITOLAY|CHOKIS|MONSTER ENERGY|RED BULL|PALETA|PALETTA|PALETT)\b/i } }).project({ nombre: 1, descripcion: 1, stock: 1, categoria: 1 }).toArray()
    ]);
    cache = {
      services: services as CatalogCache['services'],
      products: products as CatalogCache['products'],
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
  [/\b(camioneta|4x4|todo terreno|suv|troca|pickup|troc|camion|blazer|trailblazer|explorer|duster|tracker|vitara|grand vitara)\b/, 'camioneta'],
  [/\b(moto|motocicleta|picante|ciclomotor|bicicleta motorizada|pistera|cross|enduro|scooter|vespa)\b/, 'moto'],
];

export function detectarVehiculo(text: string): Vehiculo | null {
  const t = norm(text);
  for (const [pattern, v] of VEHICULO_PATTERNS) {
    if (pattern.test(t)) return v;
  }
  if (/\b(auto|automovil|carro|vehiculo|berlina|sedan|hatchback|furgoneta|van|furgon|familiar|deportivo|coupe|chevette|aveo|spark|swift|picanto|logan|sandero|twingo)\b/.test(t)) return 'auto';
  return null;
}

const SINONIMOS_SERVICIOS: Record<string, string[]> = {
  'Lavado': ['lavado', 'lavar', 'limpieza', 'aseo', 'enjuagar', 'espuma'],
  'Detailing': ['detailing', 'detallado', 'pulido', 'brillo', 'encerado', 'cera', 'abrillantar'],
  'Polarizados': ['polarizado', 'polarizar', 'polarizacion', 'pelicula', 'vidrio polarizado', 'oscurecer vidrios', 'papel polarizado', 'opaco'],
  'Mecánica': ['mecanica', 'mecanico', 'reparacion', 'arreglo', 'mantenimiento', 'revision'],
  'Pintura': ['pintura', 'pintar', 'latoneria', 'enderezado', 'pintura vehiculo', 'carroceria'],
  'Hidroblasting': ['hidroblast', 'hidrolavado', 'hidro', 'lavado presion', 'lavado motor', 'agua presion'],
};

interface Intent {
  name: string;
  keywords: { word: string; weight: number }[];
  minScore: number;
  handler: (ctx: ChatContext) => string | null;
}

interface ChatContext {
  raw: string;
  lower: string;
  tokens: string[];
  v: Vehiculo | null;
  label: string | null;
  catalog: CatalogCache;
  servEncontrado: { nombre: string; descripcion: string; duracion_minutos: number; categoria?: string } | null;
  prodEncontrado: { nombre: string; descripcion: string; stock: number; categoria?: string } | null;
}

function buildContext(raw: string, vehiculo: Vehiculo | undefined, catalog: CatalogCache): ChatContext {
  const lower = norm(raw);
  const tokens = tokenize(raw);
  const v = vehiculo || detectarVehiculo(raw) || null;
  const label = v ? (v === 'auto' ? 'Automóvil' : v === 'camioneta' ? 'Camioneta' : 'Moto') : null;

  const svcNorm = catalog.services.map(s => ({
    ...s,
    _key: norm(s.nombre),
    _tokens: tokenize(s.nombre)
  }));

  let servEncontrado: ChatContext['servEncontrado'] = null;
  for (const s of svcNorm) {
    if (lower.includes(s._key) || fuzzyIncludes(lower, s._key)) { servEncontrado = s; break; }
    const fraseTokens = s._tokens.filter(t => t.length > 3);
    if (fraseTokens.length > 0 && fraseTokens.every(t => lower.includes(t) || fuzzyIncludes(lower, t))) { servEncontrado = s; break; }
  }

  let prodEncontrado: ChatContext['prodEncontrado'] = null;
  for (const p of catalog.products) {
    const key = norm(p.nombre);
    if (lower.includes(key) || fuzzyIncludes(lower, key)) { prodEncontrado = p; break; }
  }

  return { raw, lower, tokens, v, label, catalog, servEncontrado, prodEncontrado };
}

function serviciosCompatibles(services: CatalogCache['services'], v?: Vehiculo | null) {
  return services.filter((s: any) => !s.cotizar_local);
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

// Detecta si el usuario está negando una intención
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

// Extrae el vehículo del historial reciente
function vehiculoDesdeHistorial(history: ChatTurn[]): Vehiculo | undefined {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].vehiculo) return history[i].vehiculo;
    const detected = detectarVehiculo(history[i].text);
    if (detected) return detected;
  }
  return undefined;
}

// Detecta si el bot hizo una pregunta específica en el último turno
function ultimaPreguntaBot(history: ChatTurn[]): 'vehiculo' | 'servicio' | 'fecha' | null {
  const ultimoBot = [...history].reverse().find(t => t.role === 'bot');
  if (!ultimoBot) return null;
  const t = ultimoBot.text;
  if (
    (t.includes('Automóvil') && t.includes('Camioneta') && t.includes('Moto')) ||
    t.includes('¿tu vehículo es') ||
    t.includes('tipo de vehículo')
  ) return 'vehiculo';
  if (
    t.includes('¿Tienes algún servicio') ||
    t.includes('algún servicio en mente') ||
    t.includes('¿Qué servicio')
  ) return 'servicio';
  if (
    t.includes('¿Qué fecha') ||
    t.includes('selecciona fecha') ||
    t.includes('Selecciona fecha')
  ) return 'fecha';
  return null;
}

const INTENTS: Intent[] = [
  {
    name: 'saludo',
    keywords: [
      { word: 'hola', weight: 5 }, { word: 'buenas', weight: 5 }, { word: 'buenos', weight: 5 },
      { word: 'saludos', weight: 5 }, { word: 'hey', weight: 4 }, { word: 'buen dia', weight: 5 },
      { word: 'que mas', weight: 4 }, { word: 'q mas', weight: 4 }, { word: 'buenas tardes', weight: 5 },
      { word: 'buenas noches', weight: 5 }, { word: 'buen día', weight: 5 }, { word: 'como estas', weight: 3 },
    ],
    minScore: 4,
    handler: (ctx) => {
      const base = '¡Hola! Soy el asistente virtual de **Luxury Service Manga** 🚗✨';
      if (!ctx.v) return base + '\n\n¿Qué tipo de vehículo tienes?\n• 🚗 **Automóvil**\n• 🚙 **Camioneta**\n• 🏍️ **Moto**\n\nTambién puedes preguntarme por servicios u horarios.';
      return base + `\n\nVeo que tienes **${ctx.label}**. ¿En qué puedo ayudarte?\n• Servicios disponibles\n• Horarios: 10:00 a.m. y 2:00 p.m.\n• Agendar una cita`;
    }
  },
  {
    name: 'despedida',
    keywords: [
      { word: 'adios', weight: 6 }, { word: 'chao', weight: 6 }, { word: 'bye', weight: 6 },
      { word: 'hasta luego', weight: 6 }, { word: 'nos vemos', weight: 6 }, { word: 'eso seria todo', weight: 5 },
      { word: 'gracias por tu', weight: 4 }, { word: 'gracias por su', weight: 4 }, { word: 'hasta pronto', weight: 6 },
      { word: 'que tengas buen', weight: 3 }, { word: 'feliz dia', weight: 3 }, { word: 'fue un placer', weight: 3 },
    ],
    minScore: 3,
    handler: () => '¡Hasta luego! Gracias por contactarnos. En **Luxury Service** estamos para servirte. Vuelve cuando necesites 🚗✨'
  },
  {
    name: 'ubicacion',
    keywords: [
      { word: 'donde', weight: 5 }, { word: 'ubicacion', weight: 6 }, { word: 'direccion', weight: 6 },
      { word: 'como llegar', weight: 6 }, { word: 'maps', weight: 5 }, { word: 'estan ubicados', weight: 6 },
      { word: 'mapa', weight: 5 }, { word: 'ubicado', weight: 5 }, { word: 'queda', weight: 4 },
      { word: 'qeda', weight: 3 }, { word: 'sede', weight: 4 }, { word: 'estan', weight: 3 },
    ],
    minScore: 4,
    handler: () => '📍 **Luxury Service Manga** en **Cartagena, Colombia**.\n\nAv. Principal Manga — a una cuadra del parque principal.\n\n📌 <https://maps.google.com/?q=Manga,+Cartagena,+Colombia>\n\n¿Necesitas el número para contactarnos o prefieres agendar una cita?'
  },
  {
    name: 'contacto',
    keywords: [
      { word: 'contacto', weight: 6 }, { word: 'telefono', weight: 6 }, { word: 'whatsapp', weight: 6 },
      { word: 'correo', weight: 5 }, { word: 'email', weight: 5 }, { word: 'llamar', weight: 5 },
      { word: 'celular', weight: 5 }, { word: 'wsp', weight: 5 }, { word: 'hablar', weight: 4 },
      { word: 'asesor', weight: 5 }, { word: 'comunicar', weight: 5 }, { word: 'comunico', weight: 4 },
      { word: 'ayuda', weight: 3 }, { word: 'atencion', weight: 4 }, { word: 'clientes', weight: 3 },
      { word: 'numero', weight: 4 }, { word: 'escribir', weight: 4 }, { word: 'mensaje', weight: 3 },
      { word: 'contactarnos', weight: 5 }, { word: 'ponerme en contacto', weight: 6 },
    ],
    minScore: 4,
    handler: () => '📬 **Comunícate con nosotros:**\n\n📞 **Teléfono:** +57 300 636 6429\n💬 **WhatsApp:** wa.me/573006366429\n✉️ **Correo:** luxury_admon@outlook.com\n\n✅ También puedes agendar directamente en la web con tu correo y te confirmamos todo.\n\n¿Necesitas ayuda con algo más?'
  },
  {
    name: 'horarios',
    keywords: [
      { word: 'horario', weight: 6 }, { word: 'hora', weight: 4 }, { word: 'cuando atienden', weight: 6 },
      { word: 'a que hora', weight: 5 }, { word: 'abren', weight: 5 }, { word: 'cierran', weight: 5 },
      { word: 'disponible', weight: 4 }, { word: 'atienden', weight: 5 }, { word: 'abierto', weight: 4 },
      { word: 'horarios', weight: 6 }, { word: 'turno', weight: 4 }, { word: 'horario atencion', weight: 6 },
    ],
    minScore: 4,
    handler: () => '🕐 **Horarios de atención:**\n• **Lunes a sábado:** 8:00 a.m. - 6:00 p.m.\n• **Citas disponibles:** 10:00 a.m. y 2:00 p.m.\n• **Domingos:** Cerrado ❌\n\n📅 Agenda en la sección "Agendar cita". ¿Te gustaría apartar tu cita?'
  },
  {
    name: 'agendar',
    keywords: [
      { word: 'agendar', weight: 6 }, { word: 'cita', weight: 5 }, { word: 'reservar', weight: 5 },
      { word: 'apartar', weight: 5 }, { word: 'turno', weight: 4 }, { word: 'programar', weight: 4 },
      { word: 'quiero una cita', weight: 6 }, { word: 'pedir cita', weight: 6 }, { word: 'registrar cita', weight: 5 },
      { word: 'sacar cita', weight: 5 }, { word: 'agenda', weight: 5 }, { word: 'quiero agendar', weight: 6 },
      { word: 'necesito cita', weight: 5 }, { word: 'puedo agendar', weight: 5 }, { word: 'como agendo', weight: 5 },
      { word: 'quikero agendar', weight: 3 }, { word: 'agendarr', weight: 3 }, { word: 'ajendar', weight: 3 },
    ],
    minScore: 4,
    handler: (ctx) => {
      if (ctx.servEncontrado) {
        return `📅 **Agendar: ${ctx.servEncontrado.nombre}**\n\nSigue estos pasos:\n1. Entra con tu correo en **"Acceder"**\n2. Selecciona **${ctx.servEncontrado.nombre}**\n3. Escoge fecha y horario (10:00 a.m. o 2:00 p.m.)\n4. Confirma y lista ✅\n\nRecibirás confirmación en tu cuenta.`;
      }
      return '📅 **Para agendar una cita:**\n\n1. Entra con tu correo en **"Acceder"** (solo correo, sin contraseña)\n2. Elige el **servicio** que deseas\n3. Selecciona **fecha** en el calendario\n4. Escoge **horario**: 10:00 a.m. o 2:00 p.m.\n\nRecibirás confirmación por notificación en tu cuenta. ¿Tienes algún servicio en mente?';
    }
  },
  {
    name: 'promociones',
    keywords: [
      { word: 'promocion', weight: 6 }, { word: 'descuento', weight: 6 }, { word: 'oferta', weight: 6 },
      { word: 'beneficio', weight: 4 }, { word: 'combo promocional', weight: 6 }, { word: 'notificacion', weight: 3 },
      { word: 'promo', weight: 5 }, { word: 'descuent0', weight: 3 }, { word: 'combos', weight: 4 },
      { word: 'plan', weight: 3 }, { word: 'paquete', weight: 3 }, { word: 'rebaja', weight: 4 },
    ],
    minScore: 4,
    handler: () => '🎉 **Promociones:**\n\nAl registrarte solo con tu correo recibirás **notificaciones de promociones** y **confirmación de citas**.\n\nActualmente manejamos precios especiales en combos de lavado + detailing. Pregunta por nuestros paquetes al agendar.\n\n¿Te gustaría saber más sobre algún servicio en especial?'
  },
  {
    name: 'agradecimiento',
    keywords: [
      { word: 'gracias', weight: 6 }, { word: 'perfecto', weight: 4 }, { word: 'ok', weight: 3 },
      { word: 'listo', weight: 4 }, { word: 'genial', weight: 4 }, { word: 'excelente', weight: 4 },
      { word: 'de acuerdo', weight: 4 }, { word: 'muy bien', weight: 4 }, { word: 'super', weight: 3 },
      { word: 'vale', weight: 3 }, { word: 'entendido', weight: 4 }, { word: 'claro', weight: 3 },
      { word: 'gracias totales', weight: 5 },
    ],
    minScore: 3,
    handler: () => '¡Con gusto! 😊 Estoy aquí para lo que necesites. **Luxury Service** a tu disposición.\n\n¿Hay algo más en que pueda ayudarte?'
  },
  {
    name: 'cotizacion',
    keywords: [
      { word: 'cotizar', weight: 6 }, { word: 'cotizacion', weight: 6 }, { word: 'presupuesto', weight: 6 },
      { word: 'cuanto vale', weight: 5 }, { word: 'cuanto cuesta', weight: 5 }, { word: 'cuanto cobran', weight: 5 },
      { word: 'cuanto sale', weight: 5 }, { word: 'precio tiene', weight: 5 }, { word: 'a como', weight: 4 },
      { word: 'tarifa', weight: 5 }, { word: 'me cotiza', weight: 6 }, { word: 'valor', weight: 4 },
      { word: 'precio', weight: 4 }, { word: 'precios', weight: 4 },
      { word: 'costo', weight: 4 }, { word: 'costos', weight: 4 }, { word: 'quiero cotizar', weight: 6 },
      { word: 'cotizame', weight: 5 }, { word: 'cotiza', weight: 5 }, { word: 'presupuestame', weight: 5 },
      { word: 'qiero cotizar', weight: 3 }, { word: 'cuanto dan', weight: 3 },
    ],
    minScore: 4,
    handler: (ctx) => {
      if (!ctx.v) return 'Para darte una cotización necesito saber: ¿tu vehículo es 🚗 **Automóvil**, 🚙 **Camioneta** o 🏍️ **Moto**?';
      const disponibles = serviciosCompatibles(ctx.catalog.services, ctx.v);
      if (ctx.servEncontrado) {
        return `📋 **${ctx.servEncontrado.nombre}**\n• Duración: ${ctx.servEncontrado.duracion_minutos} minutos\n• ${ctx.servEncontrado.descripcion}\n\nLos precios de referencia los encuentras en la sección **Cotizar** de nuestra web. ¿Agendamos tu cita?`;
      }
      let out = `📋 **SERVICIOS DISPONIBLES para ${ctx.label}:**\n\n`;
      const categorias = new Map<string, typeof disponibles>();
      for (const s of disponibles) {
        const cat = s.categoria || 'OTROS';
        if (!categorias.has(cat)) categorias.set(cat, []);
        categorias.get(cat)!.push(s);
      }
      for (const [cat, items] of categorias) {
        out += `**${cat}:**\n`;
        out += items.slice(0, 5).map(s => `• ${s.nombre}`).join('\n') + '\n\n';
      }
      out += '¿Te gustaría agendar alguno?';
      return out;
    }
  },
  {
    name: 'servicios',
    keywords: [
      { word: 'servicios', weight: 6 }, { word: 'servicio', weight: 5 }, { word: 'catalogo', weight: 5 },
      { word: 'mantenimiento', weight: 4 }, { word: 'que servicios', weight: 6 }, { word: 'que hacen', weight: 4 },
      { word: 'que ofrecen', weight: 5 }, { word: 'menu', weight: 3 }, { word: 'servicios tienen', weight: 5 },
      { word: 'trabajan', weight: 3 }, { word: 'listado', weight: 3 }, { word: 'carta', weight: 2 },
      { word: 'portafolio', weight: 3 }, { word: 'que tipo', weight: 4 }, { word: 'tipos de', weight: 4 },
      { word: 'que tienen', weight: 4 }, { word: 'hay disponible', weight: 4 },
    ],
    minScore: 4,
    handler: (ctx) => {
      const disponibles = serviciosCompatibles(ctx.catalog.services, ctx.v);
      let out = `📋 **SERVICIOS LUXURY SERVICE MANGA**${ctx.v ? ` (${ctx.label})` : ''}:\n`;
      const categorias = new Map<string, typeof disponibles>();
      for (const s of disponibles) {
        const cat = s.categoria || 'OTROS';
        if (!categorias.has(cat)) categorias.set(cat, []);
        categorias.get(cat)!.push(s);
      }
      for (const [cat, items] of categorias) {
        out += `\n**${cat.toUpperCase()}:**\n`;
        out += items.slice(0, 8).map(x => `• ${x.nombre}`).join('\n');
        if (items.length > 8) out += `\n... y ${items.length - 8} más`;
      }
      out += '\n\n¿Te gustaría **cotizar** algún servicio o **agendar** una cita?';
      return out;
    }
  },
  {
    name: 'productos',
    keywords: [
      { word: 'producto', weight: 6 }, { word: 'productos', weight: 6 }, { word: 'tienda', weight: 5 },
      { word: 'comprar', weight: 5 }, { word: 'stock', weight: 4 }, { word: 'articulo', weight: 4 },
      { word: 'quiero comprar', weight: 5 }, { word: 'me interesa un producto', weight: 5 },
      { word: 'articulos', weight: 4 }, { word: 'venden', weight: 4 }, { word: 'venta', weight: 3 },
      { word: 'compras', weight: 3 },
    ],
    minScore: 4,
    handler: (ctx) => {
      if (ctx.catalog.products.length === 0) return 'Por el momento no hay productos en tienda.';
      if (ctx.prodEncontrado) {
        return `🛒 **${ctx.prodEncontrado.nombre}**\n${ctx.prodEncontrado.descripcion}\nStock: ${ctx.prodEncontrado.stock > 0 ? '✅ ' + ctx.prodEncontrado.stock + ' unidades' : '❌ Agotado'}\n\n¿Quieres comprarlo? Ve a la **Tienda** con tu correo registrado.`;
      }
      const catMap = new Map<string, typeof ctx.catalog.products>();
      for (const p of ctx.catalog.products) {
        const cat = p.categoria || 'OTROS';
        if (!catMap.has(cat)) catMap.set(cat, []);
        catMap.get(cat)!.push(p);
      }
      let out = '🛒 **Catálogo de productos:**\n\n';
      for (const [cat, items] of catMap) {
        out += `**${cat}:**\n`;
        out += items.slice(0, 5).map(p => `• ${p.nombre} — ${p.stock > 0 ? `${p.stock} disp.` : 'agotado'}`).join('\n') + '\n\n';
      }
      out += 'Compra en la sección **Tienda** con tu correo registrado. ¿Buscas algo en particular?';
      return out;
    }
  },
  {
    name: 'vehiculo_solo',
    keywords: [
      { word: 'automovil', weight: 3 }, { word: 'camioneta', weight: 3 }, { word: 'moto', weight: 3 },
      { word: 'carro', weight: 3 }, { word: 'auto', weight: 3 }, { word: 'vehiculo', weight: 2 },
      { word: 'motocicleta', weight: 3 }, { word: '4x4', weight: 2 }, { word: 'suv', weight: 2 },
      { word: 'troca', weight: 2 }, { word: 'pickup', weight: 2 },
    ],
    minScore: 3,
    handler: (ctx) => {
      const msgWords = ctx.lower.split(/\s+/).filter(Boolean);
      if (msgWords.length > 4) return null;
      if (!ctx.v) return '¿Tu vehículo es 🚗 **Automóvil**, 🚙 **Camioneta** o 🏍️ **Moto**?';
      return `¡Perfecto! Has seleccionado **${ctx.label}**. Puedo ayudarte con:\n• Ver **servicios** disponibles\n• **Horarios**: 10:00 a.m. y 2:00 p.m.\n• **Agendar** una cita\n\n¿Qué deseas consultar?`;
    }
  },
];

const CATEGORIA_MAP: [RegExp, string[]][] = [
  [/\b(lavados?|hidroblast|chasis|vapores?|encerados?|combos?|express|generales?|espumas?|enjuagues?|lavar|limpieza exterior)/, ['Servicios Básicos', 'Combos', 'Lavado']],
  [/\b(alineacion|balanceo|llantas?|suspension|faros?|direccion|amortiguadores?|ruedas?|cauchos?|neumaticos?|rines?)/, ['Alineación y Balanceo', 'Llantas']],
  [/\b(frenos?|pastillas?|bandas?|liquido de freno|calipers?|discos?|frenado)/, ['Mantenimiento de Frenos']],
  [/\b(lubric|cambio de aceite|cambio aceite|filtros?|aceites?|engrases?)/, ['Lubricación']],
  [/\b(detailing|pulidos?|ceramicos?|nano|rayon|farolas?|tapicer|luxury|detallados?|brillos?|ceras?|encerados?|pulir|abrillantar|detallar)/, ['Servicios Detailing', 'Detailing']],
  [/\b(anticorrosiv|cabinas?|pinturas?|agua caliente|cavidades?|oxido|herrumbre|corrosion|protectores?)/, ['Servicios Anticorrosivos']],
  [/\b(polarizados?|polarizacion|vidrios?|peliculas?|polarizar|polarizad|opacos?|film)/, ['Polarizados']],
  [/\b(pinturas?|pintar|latoneria|latas|enderezada|chapista|carroceria|enderezar|pintura completa|repintar)/, ['Servicios de Pintura', 'Pintura']],
  [/\b(diagnosti|scan|computador|escaneo|electr|fallas?|test|revisar|comprobar|chequeos?|check)/, ['Diagnóstico']],
  [/\b(proteccion|protect|anticorrosivo|ceramico|selladores?|protectores?)/, ['Protección']],
  [/\b(adicionales?|extra|accesorios?|complementos?)/, ['Adicionales']],
  [/\b(farolas?|faros?|luz|iluminacion|optic)/, ['Farolas']],
];

export async function buildChatbotReply(
  message: string,
  history: ChatTurn[] = [],
  vehiculoExplicito?: Vehiculo
): Promise<string> {
  const catalog = await getCatalog();

  // Hereda el vehículo del historial si no viene explícito ni en el mensaje actual
  const vehiculoDetectadoMensaje = detectarVehiculo(message);
  const vehiculoHeredado: Vehiculo | undefined =
    vehiculoExplicito ??
    vehiculoDetectadoMensaje ??
    vehiculoDesdeHistorial(history) ??
    undefined;

  const ctx = buildContext(message, vehiculoHeredado, catalog);

  // ── SLOT FILLING: responde según la última pregunta del bot ──────────────
  const preguntaPendiente = ultimaPreguntaBot(history);

  if (preguntaPendiente === 'vehiculo' && ctx.v) {
    // El usuario está respondiendo con su vehículo
    const disponibles = serviciosCompatibles(catalog.services, ctx.v);
    let out = `¡Perfecto! Has seleccionado **${ctx.label}**. Puedo ayudarte con:\n`;
    out += '• Ver **servicios** disponibles\n';
    out += '• **Horarios**: 10:00 a.m. y 2:00 p.m.\n';
    out += '• **Agendar** una cita\n\n';
    if (disponibles.length > 0) {
      out += `Tenemos **${disponibles.length} servicios** para ${ctx.label}. ¿Qué deseas consultar?`;
    } else {
      out += '¿Qué deseas consultar?';
    }
    return out;
  }

  if (preguntaPendiente === 'servicio' && ctx.servEncontrado) {
    // El usuario respondió con un servicio específico
    return `📅 **Agendar: ${ctx.servEncontrado.nombre}**\n\nSigue estos pasos:\n1. Entra con tu correo en **"Acceder"**\n2. Selecciona **${ctx.servEncontrado.nombre}**\n3. Escoge fecha y horario (10:00 a.m. o 2:00 p.m.)\n4. Confirma y lista ✅\n\nRecibirás confirmación en tu cuenta.`;
  }

  // ── DETECCIÓN DE INTENT PRINCIPAL ───────────────────────────────────────
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

  // ── FALLBACKS POR ORDEN DE ESPECIFICIDAD ────────────────────────────────

  if (ctx.servEncontrado) {
    return `🔧 **${ctx.servEncontrado.nombre}**\n• Duración: ${ctx.servEncontrado.duracion_minutos} minutos\n• ${ctx.servEncontrado.descripcion}\n\n¿Agendamos tu cita? Horarios: 10:00 a.m. o 2:00 p.m.`;
  }

  let catMatch: string[] | null = null;
  for (const [pattern, cats] of CATEGORIA_MAP) {
    if (pattern.test(ctx.lower)) { catMatch = cats; break; }
  }
  if (catMatch) {
    const disponibles = serviciosCompatibles(catalog.services, ctx.v);
    const items = disponibles.filter(s => catMatch!.includes(s.categoria || ''));
    if (items.length > 0) {
      const lines = items.map(s => `• **${s.nombre}**`);
      return `🔧 **${items[0].categoria?.toUpperCase() || 'SERVICIOS'}**${ctx.label ? ` (${ctx.label})` : ''}:\n${lines.join('\n')}\n\n¿Te interesa alguno? Puedo darte más detalles.`;
    }
  }

  if (ctx.prodEncontrado) {
    return `🛒 **${ctx.prodEncontrado.nombre}**\n${ctx.prodEncontrado.descripcion}\nStock: ${ctx.prodEncontrado.stock > 0 ? '✅ ' + ctx.prodEncontrado.stock + ' unidades' : '❌ Agotado'}\n\n¿Quieres comprarlo? Ve a la **Tienda** con tu correo registrado.`;
  }

  const detectedCategory = Object.entries(SINONIMOS_SERVICIOS).find(([_, words]) =>
    words.some(w => ctx.lower.includes(w) || fuzzyIncludes(ctx.lower, w))
  );
  if (detectedCategory) {
    const disponibles = serviciosCompatibles(catalog.services, ctx.v);
    const items = disponibles.filter(s => s.categoria === detectedCategory[0] || s.nombre.toLowerCase().includes(detectedCategory[0].toLowerCase()));
    if (items.length > 0) {
      const lines = items.map(s => `• **${s.nombre}**`);
      return `🔧 **${detectedCategory[0].toUpperCase()}**${ctx.label ? ` (${ctx.label})` : ''}:\n${lines.join('\n')}\n\n¿Te interesa alguno? Puedo darte más detalles.`;
    }
  }

  const mentionsService = ctx.tokens.some(t => {
    for (const s of catalog.services) {
      const st = tokenize(s.nombre);
      if (st.some(stt => fuzzyMatch(t, stt) >= 0.7)) return true;
    }
    return false;
  });

  if (ctx.v && mentionsService) {
    const disponibles = serviciosCompatibles(catalog.services, ctx.v).slice(0, 18);
    const lines = disponibles.map(s => `• **${s.nombre}**`).join('\n');
    return `📋 **Servicios para ${ctx.label}:**\n${lines}\n\n¿Te gustaría más información sobre alguno en particular o agendar una cita?`;
  }

  // ── FALLBACK INTELIGENTE ─────────────────────────────────────────────────
  return buildSmartFallback(ctx, catalog);
}

function buildSmartFallback(ctx: ChatContext, catalog: CatalogCache): string {
  // Si detectamos tokens cercanos a algún servicio, sugerimos los más parecidos
  const serviciosCercanos = catalog.services.filter(s =>
    ctx.tokens.some(t => {
      const st = tokenize(s.nombre);
      return st.some(stt => fuzzyMatch(t, stt) >= 0.55);
    })
  ).slice(0, 3);

  if (serviciosCercanos.length > 0) {
    const nombres = serviciosCercanos.map(s => `**${s.nombre}**`).join(', ');
    return `¿Te refieres a alguno de estos servicios? ${nombres}\n\nO cuéntame con más detalle qué necesitas. 😊`;
  }

  // Si tiene vehículo pero no entendimos la intención
  if (ctx.v) {
    const disponibles = serviciosCompatibles(catalog.services, ctx.v);
    return `No entendí bien tu mensaje 😊 Tienes **${ctx.label}** — puedo ayudarte con:\n• **Servicios** (${disponibles.length} disponibles)\n• **Horarios**: 10:00 a.m. y 2:00 p.m.\n• **Agendar** una cita\n• **Cotizar** un servicio\n\n¿Qué necesitas?`;
  }

  // Si hay palabras relacionadas con alguna intención conocida
  const sugerencias: string[] = [];
  if (/\b(servicio|hacen|ofrecen|trabajan|producto|lavado|detailing|mecanic|pintur)\b/.test(ctx.lower)) sugerencias.push('ver los **servicios**');
  if (/\b(agendar|cita|turno|reserv|apartar|programar)\b/.test(ctx.lower)) sugerencias.push('**agendar una cita**');
  if (/\b(horario|hora|atienden|abren)\b/.test(ctx.lower)) sugerencias.push('consultar **horarios**');

  if (sugerencias.length > 0) {
    return `No entendí bien, ¿quieres ${sugerencias.join(' o ')}?\n\nPrimero dime: ¿tu vehículo es 🚗 **Automóvil**, 🚙 **Camioneta** o 🏍️ **Moto**?`;
  }

  return '¡Hola! Puedo ayudarte con:\n• **Servicios** de lavado, detailing, mecánica y más\n• **Horarios**: 10:00 a.m. y 2:00 p.m.\n• **Agendar** una cita\n• **Productos** en tienda\n• **Contacto** y ubicación\n\nPrimero dime: ¿tu vehículo es 🚗 **Automóvil**, 🚙 **Camioneta** o 🏍️ **Moto**?';
}

export function invalidateChatbotCache() {
  cache = null;
}