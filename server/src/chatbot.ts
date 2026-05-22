import { getDb } from './db.js';

export const HORARIOS_LABEL = ['10:00 a.m.', '2:00 p.m.'] as const;
export const HORARIOS = ['10:00', '14:00'] as const;

interface CatalogCache {
  services: { nombre: string; descripcion: string; precio_base: number; precio_auto?: number; precio_camioneta?: number; duracion_minutos: number; categoria?: string }[];
  products: { nombre: string; descripcion: string; precio: number; stock: number; categoria?: string }[];
  loadedAt: number;
}

let cache: CatalogCache | null = null;
const CACHE_TTL = 300_000;

async function getCatalog(): Promise<CatalogCache> {
  if (cache && Date.now() - cache.loadedAt < CACHE_TTL) return cache;
  const db = getDb();
  const [services, products] = await Promise.all([
    db.collection('servicios').find({ activo: true }).project({ nombre: 1, descripcion: 1, precio_base: 1, precio_auto: 1, precio_camioneta: 1, duracion_minutos: 1, categoria: 1 }).toArray(),
    db.collection('productos').find().project({ nombre: 1, descripcion: 1, precio: 1, stock: 1, categoria: 1 }).toArray()
  ]);
  cache = {
    services: services as CatalogCache['services'],
    products: products as CatalogCache['products'],
    loadedAt: Date.now()
  };
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

function cop(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
}

function precioLine(s: { nombre: string; precio_auto?: number; precio_camioneta?: number; precio_base: number }) {
  const auto = s.precio_auto ?? s.precio_base;
  const cam = s.precio_camioneta ?? s.precio_base;
  return `• ${s.nombre}: Auto ${cop(auto)} | Camioneta ${cop(cam)}`;
}

function matchAny(text: string, words: string[]) {
  return words.some(w => text.includes(w));
}

export async function buildChatbotReply(message: string): Promise<string> {
  const lower = message.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

  if (matchAny(lower, ['hola', 'buenas', 'hey', 'saludos', 'buenos'])) {
    return `¡Hola! Soy el asistente de Luxury Service. Puedo ayudarte con precios de servicios y productos, horarios (10:00 a.m. y 2:00 p.m.), agendar citas y promociones. ¿Qué te gustaría saber?`;
  }

  if (matchAny(lower, ['horario', 'hora', 'cuando', 'disponib', '10', '2 pm', '14'])) {
    return `Horarios de atención para citas:\n• 10:00 a.m.\n• 2:00 p.m.\n\nAgenda en la sección "Agendar cita". Los domingos no hay servicio.`;
  }

  if (matchAny(lower, ['agendar', 'cita', 'reserv', 'turno'])) {
    return `Para agendar: entra con tu correo en "Acceder" (sin contraseña), elige servicio, fecha en el calendario y horario 10:00 a.m. o 2:00 p.m. Recibirás confirmación por notificación en tu cuenta.`;
  }

  if (matchAny(lower, ['promoc', 'descuent', 'oferta', 'notific'])) {
    return `Al registrarte solo con tu correo recibirás notificaciones de promociones y confirmación cuando agendes una cita. Revisa tu perfil para ver avisos recientes.`;
  }

  if (matchAny(lower, ['ubicacion', 'donde', 'direccion', 'colombia', 'bogota', 'medellin'])) {
    return 'Luxury Service opera en Colombia. Para dirección exacta y cobertura, contáctanos al agendar tu cita o escribe "contacto".';
  }

  if (matchAny(lower, ['contacto', 'telefono', 'whatsapp', 'correo', 'email'])) {
    return 'Contacto: privacidad@luxuryservice.co · Agenda en la web con tu correo. Te enviamos notificaciones de tu cita y promociones.';
  }

  if (matchAny(lower, ['gracias', 'perfecto', 'ok', 'listo', 'genial'])) {
    return '¡Con gusto! Estoy aquí si necesitas precios, servicios, productos u horarios. Luxury Service a tu disposición.';
  }

  if (matchAny(lower, ['camioneta', 'suv', 'pickup'])) {
    return `Todos nuestros precios tienen tarifa AUTO y CAMIONETA. Ejemplo Lavado General Express: Auto $45.000 · Camioneta $50.000. Ver /servicios`;
  }

  const catalog = await getCatalog();

  if (matchAny(lower, ['precio', 'cuesta', 'vale', 'costo', 'cuanto', 'tarifa', 'cotiz'])) {
    const svcLines = catalog.services.slice(0, 12).map(s => precioLine(s)).join('\n');
    const prodLines = catalog.products.slice(0, 6).map(p => `• ${p.nombre}: ${cop(p.precio)}${p.stock <= 0 ? ' (agotado)' : ''}`).join('\n');
    return `Precios 2026 (IVA incluido):\n\nSERVICIOS:\n${svcLines}\n\nPRODUCTOS:\n${prodLines}\n\nVer tarifario completo en /servicios`;
  }

  if (matchAny(lower, ['producto', 'tienda', 'comprar', 'stock', 'aceite', 'filtro', 'cera', 'aromat'])) {
    if (catalog.products.length === 0) return 'Por el momento no hay productos en tienda.';
    const lines = catalog.products.map(p =>
      `• ${p.nombre} — ${cop(p.precio)} — ${p.stock > 0 ? `${p.stock} disponibles` : 'agotado'}\n  ${p.descripcion}`
    ).join('\n\n');
    return `Catálogo de productos:\n\n${lines}`;
  }

  if (matchAny(lower, ['lavado', 'hidroblast', 'chasis', 'vapor', 'wd40', 'combo', 'encerado', 'grafit'])) {
    const items = catalog.services.filter(s => ['Servicios Básicos', 'Combos'].includes(s.categoria || ''));
    return `TARIFARIO LAVADO Y COMBOS (IVA incluido):\n${items.map(s => precioLine(s)).join('\n')}`;
  }
  if (matchAny(lower, ['alineacion', 'balanceo', 'llanta', 'suspension', 'faro'])) {
    const items = catalog.services.filter(s => s.categoria === 'Alineación y Balanceo');
    return `ALINEACIÓN Y BALANCEO:\n${items.map(s => `• ${s.nombre}: ${cop(s.precio_base)}`).join('\n')}`;
  }
  if (matchAny(lower, ['freno', 'pastilla', 'banda', 'liquido de freno'])) {
    const items = catalog.services.filter(s => s.categoria === 'Mantenimiento de Frenos');
    return `MANTENIMIENTO DE FRENOS:\n${items.map(s => `• ${s.nombre}: ${cop(s.precio_base)}`).join('\n')}`;
  }
  if (matchAny(lower, ['lubric', 'aceite', 'filtro'])) {
    const items = catalog.services.filter(s => s.categoria === 'Lubricación');
    return `LUBRICACIÓN:\n${items.map(s => `• ${s.nombre}: ${cop(s.precio_base)}`).join('\n')}`;
  }
  if (matchAny(lower, ['detailing', 'pulido', 'ceramico', 'nano', 'rayon', 'farola', 'tapicer', 'luxury'])) {
    const items = catalog.services.filter(s => s.categoria === 'Servicios Detailing');
    return `DETAILING (IVA incluido):\n${items.map(s => precioLine(s)).join('\n')}`;
  }
  if (matchAny(lower, ['anticorrosiv', 'cabina', 'pintura', 'agua caliente'])) {
    const items = catalog.services.filter(s => s.categoria === 'Servicios Anticorrosivos');
    return `ANTICORROSIVOS:\n${items.map(s => precioLine(s)).join('\n')}`;
  }
  if (matchAny(lower, ['servicio', 'manten', 'estetica', 'catalogo'])) {
    const byCat: Record<string, typeof catalog.services> = {};
    for (const s of catalog.services) {
      const c = s.categoria || 'Otros';
      (byCat[c] ??= []).push(s);
    }
    let out = 'CATÁLOGO LUXURY SERVICE MANGA M&S:\n';
    for (const [cat, items] of Object.entries(byCat)) {
      out += `\n${cat.toUpperCase()}:\n${items.slice(0, 4).map(s => `• ${s.nombre}: ${cop(s.precio_base)}`).join('\n')}\n`;
    }
    return out + '\nVer detalle en /servicios';
  }

  for (const s of catalog.services) {
    const key = s.nombre.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
    if (lower.includes(key.split(' ')[0]) || lower.includes(key)) {
      return `${s.nombre}: ${cop(s.precio_base)} · ${s.duracion_minutos} minutos.\n${s.descripcion}\n\n¿Agendamos tu cita? Horarios: 10:00 a.m. o 2:00 p.m.`;
    }
  }

  for (const p of catalog.products) {
    const key = p.nombre.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
    if (lower.includes(key.split(' ')[0]) || key.split(' ').some(w => w.length > 4 && lower.includes(w))) {
      return `${p.nombre}: ${cop(p.precio)}. ${p.descripcion}. Stock: ${p.stock > 0 ? p.stock + ' unidades' : 'agotado'}. Compra en Tienda con tu correo registrado.`;
    }
  }

  return `Puedo ayudarte con:\n• Precios de servicios y productos\n• Horarios: 10:00 a.m. y 2:00 p.m.\n• Cómo agendar una cita\n• Promociones y notificaciones\n\nEjemplo: "¿Cuánto cuesta el cambio de aceite?" o "precios de productos"`;
}

export function invalidateChatbotCache() {
  cache = null;
}
