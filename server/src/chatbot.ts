import { getDb } from './db.js';

export const HORARIOS_LABEL = ['10:00 a.m.', '2:00 p.m.'] as const;
export const HORARIOS = ['10:00', '14:00'] as const;

interface CatalogCache {
  services: { nombre: string; descripcion: string; duracion_minutos: number; categoria?: string }[];
  products: { nombre: string; descripcion: string; stock: number; categoria?: string }[];
  loadedAt: number;
}

let cache: CatalogCache | null = null;
const CACHE_TTL = 300_000;

type Vehiculo = 'auto' | 'camioneta' | 'moto';

function norm(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function tokenize(text: string): string[] {
  return norm(text).split(/[^a-z0-9]+/).filter(Boolean);
}

async function getCatalog(): Promise<CatalogCache> {
  if (cache && Date.now() - cache.loadedAt < CACHE_TTL) return cache;
  const db = getDb();
  const [services, products] = await Promise.all([
    db.collection('servicios').find({ activo: true }).project({ nombre: 1, descripcion: 1, duracion_minutos: 1, categoria: 1 }).toArray(),
    db.collection('productos').find({ nombre: { $not: /\b(CAFE|CAFÉ|TINTO|CAPUCCINO|CAPUCHINO|COCOSET|COCOSETTE|ABUELITA|NESCAFE|LATTES|LATTE|CHOCOLATE|CERVEZA|GASEOSA|GATORADE|JUGO|GALLETA|CHIPS|CHEETOS|DORITOS|DETODITO|FRITOLAY|CHOKIS|MONSTER ENERGY|RED BULL|PALETA|PALETTA|PALETT)\b/i } }).project({ nombre: 1, descripcion: 1, stock: 1, categoria: 1 }).toArray()
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

function labelVehiculo(v: Vehiculo): string {
  if (v === 'auto') return 'Automóvil';
  if (v === 'camioneta') return 'Camioneta';
  return 'Moto';
}

function serviciosCompatibles(services: CatalogCache['services'], v?: Vehiculo) {
  let filtered = services.filter((s: any) => !s.cotizar_local);
  return filtered;
}

function detectarVehiculo(text: string): Vehiculo | null {
  const t = norm(text);
  if (/\b(camioneta|4x4|todo terreno|suv|troca|pickup)\b/.test(t)) return 'camioneta';
  if (/\b(moto|motocicleta|picante|ciclomotor)\b/.test(t)) return 'moto';
  if (/\b(auto|automovil|carro|vehiculo|sedan|hatchback|furgoneta|van|camioneta\b(?!.*\b(?:4x4|suv|troca|pickup)\b))/i.test(t)) return 'auto';
  return null;
}

function matchPattern(text: string, patterns: RegExp[]): boolean {
  return patterns.some(p => p.test(text));
}

function matchWords(text: string, words: string[]): boolean {
  const tokens = new Set(tokenize(text));
  return words.some(w => tokens.has(w));
}

export async function buildChatbotReply(message: string, vehiculo?: Vehiculo): Promise<string> {
  const raw = message;
  const lower = norm(raw);
  const tokens = tokenize(raw);
  const v: Vehiculo | undefined = vehiculo || detectarVehiculo(raw) || undefined;
  const label = v ? labelVehiculo(v) : null;

  const catalog = await getCatalog();

  // ── Detectar nombre de servicio en lenguaje natural ──
  const svcNorm = catalog.services.map(s => ({
    ...s,
    _key: norm(s.nombre),
    _tokens: tokenize(s.nombre)
  }));

  const matchServicioEnFrase = (): typeof svcNorm[number] | null => {
    for (const s of svcNorm) {
      if (lower.includes(s._key)) return s;
      const fraseTokens = s._tokens.filter(t => t.length > 3);
      if (fraseTokens.length > 0 && fraseTokens.every(t => lower.includes(t))) return s;
    }
    return null;
  };

  const servEncontrado = matchServicioEnFrase();

  // ── 1. Saludo ──
  if (matchPattern(lower, [/^(hola|buenas|buen[ao]s|hey|saludos|que mas|q mas|buen dia)/])) {
    const base = '¡Hola! Soy el asistente virtual de **Luxury Service Manga** 🚗✨';
    if (!v) return base + '\n\n¿Qué tipo de vehículo tienes?\n• 🚗 **Automóvil**\n• 🚙 **Camioneta**\n• 🏍️ **Moto**\n\nTambién puedes preguntarme por servicios u horarios.';
    return base + `\n\nVeo que tienes **${label}**. ¿En qué puedo ayudarte?\n• Servicios disponibles\n• Horarios: 10:00 a.m. y 2:00 p.m.\n• Agendar una cita`;
  }

  // ── 2. Despedida ──
  if (matchPattern(lower, [/\b(adios|chao|bye|hasta luego|nos vemos|gracias por tu|eso seria todo)\b/])) {
    return '¡Hasta luego! Gracias por contactarnos. En **Luxury Service** estamos para servirte. Vuelve cuando necesites 🚗✨';
  }

  // ── 3. Vehiculo ──
  const vDetectado = detectarVehiculo(raw);
  if (vDetectado && !vehiculo) {
    return `¡Perfecto! Has seleccionado **${labelVehiculo(vDetectado)}**. Puedo ayudarte con:\n• Ver **servicios** disponibles\n• **Horarios**: 10:00 a.m. y 2:00 p.m.\n• **Agendar** una cita\n\n¿Qué deseas consultar?`;
  }

  // ── 4. Ubicacion ──
  if (matchPattern(lower, [/\b(donde|ubicacion|direccion|como llegar|maps|estan ubicados)\b/])) {
    return '📍 **Luxury Service Manga** está en **Cartagena, Colombia**.\n\nPara la dirección exacta y coordenadas, contáctanos al agendar tu cita o escribe "contacto" para más información.';
  }

  // ── 5. Contacto / Comunicación ──
  if (matchPattern(lower, [/\b(contacto|telefono|whatsapp|correo|email|escribir|llamar|celular|wsp|comunicar|hablar|contactarnos|asesor|atencion|ponerme en contacto|ayuda|comunico)\b/])) {
    return '📬 **Comunícate con nosotros:**\n\n📞 **Teléfono:** +57 300 636 6429\n💬 **WhatsApp:** wa.me/573006366429\n\n✅ También puedes agendar directamente en la web con tu correo y te confirmamos todo por notificación.\n\n¿Necesitas ayuda con algo más?';
  }

  // ── 6. Horarios ──
  if (matchPattern(lower, [/\b(horario|hora|cuando atienden|a que hora|abren|cierra|disponib)\b/])) {
    return '🕐 **Horarios de atención:**\n• **10:00 a.m.** — Primer turno\n• **2:00 p.m.** — Segundo turno\n\n📅 Agenda en la sección "Agendar cita". Domingos no hay servicio.\n\n¿Te gustaría agendar una cita?';
  }

  // ── 7. Agendar cita ──
  if (matchPattern(lower, [/\b(agendar|quiero (una )?cita|reservar|apartar|turno|programar|registrar cita|pedir cita)\b/])) {
    let out = '📅 **Para agendar una cita:**\n\n1. Entra con tu correo en **"Acceder"** (solo correo, sin contraseña)\n2. Elige el **servicio** que deseas\n3. Selecciona **fecha** en el calendario\n4. Escoge **horario**: 10:00 a.m. o 2:00 p.m.\n\nRecibirás confirmación por notificación en tu cuenta.';
    if (servEncontrado) {
      out = `📅 **Agendar: ${servEncontrado.nombre}**\n\nSigue estos pasos:\n1. Entra con tu correo en **"Acceder"**\n2. Selecciona **${servEncontrado.nombre}**\n3. Escoge fecha y horario\n4. Confirma y paga\n\nRecibirás confirmación.`;
    }
    return out;
  }

  // ── 8. Promociones ──
  if (matchPattern(lower, [/\b(promoc|descuent|oferta|notificacion|beneficio|combo promocional)\b/])) {
    return '🎉 **Promociones:**\n\nAl registrarte solo con tu correo recibirás **notificaciones de promociones** y **confirmación de citas**.\n\nRevisa tu perfil para ver avisos recientes. ¿Te gustaría saber más sobre algún servicio en especial?';
  }

  // ── 9. Agradecimiento ──
  if (matchPattern(lower, [/\b(gracias|perfecto|ok|listo|genial|excelente|de acuerdo|muy bien|super|vale)\b/])) {
    return '¡Con gusto! 😊 Estoy aquí para lo que necesites. **Luxury Service** a tu disposición.\n\n¿Hay algo más en que pueda ayudarte?';
  }

  // ── 10. Cotizacion ──
  if (matchPattern(lower, [/\b(cotiza|presupuesto|cuanto (vale|cuesta|cobran|sale)|precio tiene|a como|tarifa|me cotiza|cotizacion)\b/])) {
    if (!v) return 'Para darte una cotización necesito saber: ¿tu vehículo es 🚗 **Automóvil**, 🚙 **Camioneta** o 🏍️ **Moto**?';
    const disponibles = serviciosCompatibles(catalog.services, v);
    let out = '';
    if (servEncontrado) {
      const dur = servEncontrado.duracion_minutos;
      out = `📋 **${servEncontrado.nombre}**\n• Duración: ${dur} minutos\n• ${servEncontrado.descripcion}\n\n¿Agendamos tu cita?`;
    } else {
      const svcLines = disponibles.map(s => `• **${s.nombre}**`).join('\n');
      out = `📋 **SERVICIOS DISPONIBLES para ${label}:**\n${svcLines}\n\n¿Te gustaría agendar alguno?`;
    }
    return out;
  }

  // ── 11. Precios (redirigir a cotización) ──
  if (matchPattern(lower, [/\b(precio|cuesta|vale|costo|cuanto (sale|cobran|vale|dan)|tarifa|mejor precio)\b/]) || matchWords(lower, ['precio', 'costos', 'valores'])) {
    if (!v) return 'Para consultar primero dime: ¿🚗 **Automóvil**, 🚙 **Camioneta** o 🏍️ **Moto**?';
    const disponibles = serviciosCompatibles(catalog.services, v);
    if (servEncontrado) {
      return `🔧 **${servEncontrado.nombre}**\n• Duración: ${servEncontrado.duracion_minutos} min.\n• ${servEncontrado.descripcion}\n\n¿Te gustaría agendar?`;
    }
    const svcLines = disponibles.slice(0, 12).map(s => `• **${s.nombre}**`).join('\n');
    return `📋 **Servicios para ${label}:**\n${svcLines}\n\nLos valores de referencia los encuentras en la sección **Cotizar** de nuestra web. ¿Te interesa alguno?`;
  }

  // ── 12. Servicios por categoria (lógica agrupada) ──
  const CATEGORIA_MAP: [RegExp, string][] = [
    [/\b(lavado|hidroblast|chasis|vapor|encerado|combo|express|general)\b/, 'Servicios Básicos,Combos'],
    [/\b(alineacion|balanceo|llanta|suspension|faro|direccion|amortiguador)\b/, 'Alineación y Balanceo'],
    [/\b(freno|pastilla|banda|liquido de freno|caliper|disco)\b/, 'Mantenimiento de Frenos'],
    [/\b(lubric|cambio de aceite|cambio aceite|filtro|aceite|engrase)\b/, 'Lubricación'],
    [/\b(detailing|pulido|ceramico|nano|rayon|farola|tapicer|luxury|detallado)\b/, 'Servicios Detailing'],
    [/\b(anticorrosiv|cabina|pintura|agua caliente|cavidad)\b/, 'Servicios Anticorrosivos'],
    [/\b(polarizado|polarizacion|vidrio|pelicula)\b/, 'Polarizados'],
    [/\b(pintura|pintar|latoneria|latas|enderezada|chapista)\b/, 'Servicios de Pintura'],
  ];

  let catMatch: string | null = null;
  for (const [pattern, cats] of CATEGORIA_MAP) {
    if (pattern.test(lower)) {
      catMatch = cats;
      break;
    }
  }

  if (catMatch) {
    const disponibles = serviciosCompatibles(catalog.services, v);
    const cats = catMatch.split(',');
    const items = disponibles.filter(s => cats.includes(s.categoria || ''));
    if (items.length === 0) return `No encontré servicios de esa categoría${label ? ' para ' + label : ''}.`;
    const lines = items.map(s => `• **${s.nombre}**`);
    return `🔧 **${items[0].categoria?.toUpperCase() || 'SERVICIOS'}**${label ? ` (${label})` : ''}:\n${lines.join('\n')}\n\n¿Te interesa alguno? Puedo darte más detalles.`;
  }

  // ── 13. Productos ──
  if (matchPattern(lower, [/\b(producto|tienda|comprar|stock|quiero comprar|me interesa un producto|articulo)\b/])) {
    if (catalog.products.length === 0) return 'Por el momento no hay productos en tienda.';
    const prodEncontrado = catalog.products.find(p => lower.includes(norm(p.nombre)));
    if (prodEncontrado) {
      return `🛒 **${prodEncontrado.nombre}**\n${prodEncontrado.descripcion}\nStock: ${prodEncontrado.stock > 0 ? '✅ ' + prodEncontrado.stock + ' unidades' : '❌ Agotado'}\n\n¿Quieres comprarlo? Ve a la **Tienda** con tu correo registrado.`;
    }
    const lines = catalog.products.map(p => `• **${p.nombre}** — ${p.stock > 0 ? `${p.stock} disp.` : 'agotado'}`).join('\n');
    return `🛒 **Catálogo de productos:**\n\n${lines}\n\nCompra en la sección **Tienda** con tu correo registrado. ¿Algún producto en especial?`;
  }

  // ── 14. Servicios general (catalogo completo) ──
  if (matchPattern(lower, [/\b(servicio|catalogo|mantenimiento|que (servicios|hacen)|que ofrecen|estetica|menu|servicios tienen|trabajan)\b/])) {
    const disponibles = serviciosCompatibles(catalog.services, v);
    let out = `📋 **SERVICIOS LUXURY SERVICE MANGA**${v ? ` (${label})` : ''}:\n`;
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

  // ── 15. Servicio específico detectado en frase natural ──
  if (servEncontrado) {
    return `🔧 **${servEncontrado.nombre}**\n• Duración: ${servEncontrado.duracion_minutos} minutos\n• ${servEncontrado.descripcion}\n\n¿Agendamos tu cita? Horarios: 10:00 a.m. o 2:00 p.m.`;
  }

  // ── 16. Producto específico detectado ──
  for (const p of catalog.products) {
    const key = norm(p.nombre);
    const tokens = tokenize(p.nombre).filter(t => t.length > 3);
    if (lower.includes(key) || (tokens.length > 0 && tokens.every(t => lower.includes(t)))) {
      return `🛒 **${p.nombre}**\n${p.descripcion}\nStock: ${p.stock > 0 ? '✅ ' + p.stock + ' unidades' : '❌ Agotado'}\n\n¿Quieres comprarlo? Ve a la **Tienda** con tu correo registrado.`;
    }
  }

  // ── 17. Fallback ──
  const base = '🤖 No entendí completamente tu mensaje. Puedo ayudarte con:\n• **Servicios** disponibles';
  if (!v) return base + '\n• Primero dime: ¿🚗 **Automóvil**, 🚙 **Camioneta** o 🏍️ **Moto**?';
  return base + '\n• **Horarios**: 10:00 a.m. y 2:00 p.m.\n• **Agendar** una cita\n• **Productos** en tienda\n• **Contacto** y ubicación\n\nEjemplos: "¿Qué servicios tienen?", "¿Cómo agendar una cita?"';
}

export function invalidateChatbotCache() {
  cache = null;
}
