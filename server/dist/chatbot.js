import { getDb } from './db.js';
export const HORARIOS_LABEL = ['10:00 a.m.', '2:00 p.m.'];
export const HORARIOS = ['10:00', '14:00'];
let cache = null;
const CACHE_TTL = 300_000;
async function getCatalog() {
    if (cache && Date.now() - cache.loadedAt < CACHE_TTL)
        return cache;
    const db = getDb();
    const [services, products] = await Promise.all([
        db.collection('servicios').find({ activo: true }).project({ nombre: 1, descripcion: 1, precio_base: 1, precio_auto: 1, precio_camioneta: 1, precio_moto: 1, duracion_minutos: 1, categoria: 1 }).toArray(),
        db.collection('productos').find({ nombre: { $not: /\b(CAFE|CAFÉ|TINTO|CAPUCCINO|CAPUCHINO|COCOSET|COCOSETTE|ABUELITA|NESCAFE|LATTES|LATTE|CHOCOLATE|CERVEZA|GASEOSA|GATORADE|JUGO|GALLETA|CHIPS|CHEETOS|DORITOS|DETODITO|FRITOLAY|CHOKIS|MONSTER ENERGY|RED BULL|PALETA|PALETTA|PALETT)\b/i } }).project({ nombre: 1, descripcion: 1, precio: 1, stock: 1, categoria: 1 }).toArray()
    ]);
    cache = {
        services: services,
        products: products,
        loadedAt: Date.now()
    };
    return cache;
}
export async function initChatbotCache() {
    try {
        cache = null;
        await getCatalog();
        console.log('[chatbot] Catálogo precargado en caché');
    }
    catch (err) {
        console.warn('[chatbot] No se pudo precargar caché al inicio:', err.message);
    }
}
function cop(n) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
}
function matchAny(text, words) {
    return words.some(w => text.includes(w));
}
function labelVehiculo(v) {
    if (v === 'auto')
        return 'Automóvil';
    if (v === 'camioneta')
        return 'Camioneta';
    return 'Moto';
}
function precioSegun(s, v) {
    if (v === 'auto')
        return s.precio_auto ?? s.precio_base;
    if (v === 'camioneta')
        return s.precio_camioneta ?? s.precio_base;
    if (v === 'moto')
        return s.precio_moto ?? s.precio_base;
    return s.precio_base;
}
function serviciosCompatibles(services, v) {
    if (v !== 'moto')
        return services;
    return services.filter(s => s.precio_moto != null && s.precio_moto > 0);
}
export async function buildChatbotReply(message, vehiculo) {
    const lower = message.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
    const v = vehiculo;
    const label = v ? labelVehiculo(v) : null;
    if (matchAny(lower, ['hola', 'buenas', 'hey', 'saludos', 'buenos'])) {
        const base = '¡Hola! Soy el asistente de Luxury Service.';
        if (!v)
            return base + ' ¿Qué tipo de vehículo tienes? 🚗 Automóvil · 🚙 Camioneta · 🏍️ Moto';
        return base + ` Veo que tienes ${label}. Pregúntame por servicios, cotización, horarios (10:00 a.m. y 2:00 p.m.) o cómo agendar.`;
    }
    if (matchAny(lower, ['automovil', 'camioneta', 'moto', 'motocicleta', 'auto'])) {
        const tipo = lower.includes('camioneta') ? 'camioneta' : lower.includes('moto') ? 'moto' : 'auto';
        return `¡Perfecto! Has seleccionado **${labelVehiculo(tipo)}**. Puedo ayudarte con:\n• Servicios disponibles\n• Cotización con precios\n• Horarios: 10:00 a.m. y 2:00 p.m.\n• Agendar cita\n\n¿Qué deseas consultar?`;
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
        return `¡Con gusto! Estoy aquí si necesitas algo más. Luxury Service a tu disposición.`;
    }
    if (matchAny(lower, ['cotizacion', 'cotizar', 'presupuesto'])) {
        if (!v)
            return 'Para cotizar necesito saber: ¿tu vehículo es Automóvil, Camioneta o Moto?';
        const catalog = await getCatalog();
        const disponibles = serviciosCompatibles(catalog.services, v);
        const svcLines = disponibles.map(s => `• ${s.nombre}: ${cop(precioSegun(s, v))}`).join('\n');
        const prodLines = catalog.products.slice(0, 8).map(p => `• ${p.nombre}: ${cop(p.precio)}`).join('\n');
        return `COTIZACIÓN para ${label} (IVA incluido):\n\nSERVICIOS:\n${svcLines}\n\nPRODUCTOS:\n${prodLines}\n\nCotiza más en /cotizar`;
    }
    const catalog = await getCatalog();
    if (matchAny(lower, ['precio', 'cuesta', 'vale', 'costo', 'cuanto', 'tarifa'])) {
        if (!v)
            return 'Para consultar precios primero dime: ¿Automóvil, Camioneta o Moto?';
        const disponibles = serviciosCompatibles(catalog.services, v);
        const svcLines = disponibles.slice(0, 12).map(s => `• ${s.nombre}: ${cop(precioSegun(s, v))}`).join('\n');
        const prodLines = catalog.products.slice(0, 6).map(p => `• ${p.nombre}: ${cop(p.precio)}`).join('\n');
        return `Precios para ${label} (IVA incluido):\n\nSERVICIOS:\n${svcLines}\n\nPRODUCTOS:\n${prodLines}\n\nVer tarifario completo en /servicios`;
    }
    if (matchAny(lower, ['producto', 'tienda', 'comprar', 'stock', 'aceite', 'filtro', 'cera', 'aromat'])) {
        if (catalog.products.length === 0)
            return 'Por el momento no hay productos en tienda.';
        const lines = catalog.products.map(p => `• ${p.nombre} — ${cop(p.precio)} — ${p.stock > 0 ? `${p.stock} disponibles` : 'agotado'}\n  ${p.descripcion}`).join('\n\n');
        return `Catálogo de productos:\n\n${lines}`;
    }
    if (matchAny(lower, ['servicio', 'manten', 'estetica', 'catalogo'])) {
        const disponibles = serviciosCompatibles(catalog.services, v);
        let out = `SERVICIOS LUXURY SERVICE MANGA M&S${v ? ` (${label})` : ''}:\n`;
        const visited = new Set();
        for (const s of disponibles) {
            if (visited.has(s.categoria || ''))
                continue;
            visited.add(s.categoria || '');
            const items = disponibles.filter(x => (x.categoria || 'Otros') === (s.categoria || 'Otros'));
            out += `\n${(s.categoria || 'OTROS').toUpperCase()}:\n`;
            out += items.slice(0, 6).map(x => {
                const p = v ? cop(precioSegun(x, v)) : '';
                return `• ${x.nombre}${p ? ': ' + p : ''}`;
            }).join('\n');
            if (items.length > 6)
                out += `\n... y ${items.length - 6} más`;
        }
        out += '\n\nVer detalle en /servicios';
        return out;
    }
    if (matchAny(lower, ['lavado', 'hidroblast', 'chasis', 'vapor', 'wd40', 'combo', 'encerado', 'grafit'])) {
        const disponibles = serviciosCompatibles(catalog.services, v);
        const items = disponibles.filter(s => ['Servicios Básicos', 'Combos'].includes(s.categoria || ''));
        const lines = items.map(s => `• ${s.nombre}${v ? ': ' + cop(precioSegun(s, v)) : ''}`);
        return `LAVADO Y COMBOS${v ? ` (${label})` : ''}:\n${lines.join('\n')}`;
    }
    if (matchAny(lower, ['alineacion', 'balanceo', 'llanta', 'suspension', 'faro'])) {
        const disponibles = serviciosCompatibles(catalog.services, v);
        const items = disponibles.filter(s => s.categoria === 'Alineación y Balanceo');
        const lines = items.map(s => `• ${s.nombre}${v ? ': ' + cop(precioSegun(s, v)) : ''}`);
        return `ALINEACIÓN Y BALANCEO:\n${lines.join('\n')}`;
    }
    if (matchAny(lower, ['freno', 'pastilla', 'banda', 'liquido de freno'])) {
        const disponibles = serviciosCompatibles(catalog.services, v);
        const items = disponibles.filter(s => s.categoria === 'Mantenimiento de Frenos');
        const lines = items.map(s => `• ${s.nombre}${v ? ': ' + cop(precioSegun(s, v)) : ''}`);
        return `MANTENIMIENTO DE FRENOS:\n${lines.join('\n')}`;
    }
    if (matchAny(lower, ['lubric', 'aceite', 'filtro'])) {
        const disponibles = serviciosCompatibles(catalog.services, v);
        const items = disponibles.filter(s => s.categoria === 'Lubricación');
        const lines = items.map(s => `• ${s.nombre}${v ? ': ' + cop(precioSegun(s, v)) : ''}`);
        return `LUBRICACIÓN:\n${lines.join('\n')}`;
    }
    if (matchAny(lower, ['detailing', 'pulido', 'ceramico', 'nano', 'rayon', 'farola', 'tapicer', 'luxury'])) {
        const disponibles = serviciosCompatibles(catalog.services, v);
        const items = disponibles.filter(s => s.categoria === 'Servicios Detailing');
        const lines = items.map(s => `• ${s.nombre}${v ? ': ' + cop(precioSegun(s, v)) : ''}`);
        return `DETAILING${v ? ` (${label})` : ''}:\n${lines.join('\n')}`;
    }
    if (matchAny(lower, ['anticorrosiv', 'cabina', 'pintura', 'agua caliente'])) {
        const disponibles = serviciosCompatibles(catalog.services, v);
        const items = disponibles.filter(s => s.categoria === 'Servicios Anticorrosivos');
        const lines = items.map(s => `• ${s.nombre}${v ? ': ' + cop(precioSegun(s, v)) : ''}`);
        return `ANTICORROSIVOS:\n${lines.join('\n')}`;
    }
    for (const s of catalog.services) {
        const key = s.nombre.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
        if (lower.includes(key.split(' ')[0]) || lower.includes(key)) {
            const p = v ? cop(precioSegun(s, v)) : '';
            return `${s.nombre}${p ? ': ' + p : ''} · ${s.duracion_minutos} minutos.\n${s.descripcion}\n\n¿Agendamos tu cita? Horarios: 10:00 a.m. o 2:00 p.m.`;
        }
    }
    for (const p of catalog.products) {
        const key = p.nombre.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
        if (lower.includes(key.split(' ')[0]) || key.split(' ').some(w => w.length > 4 && lower.includes(w))) {
            return `${p.nombre}: ${cop(p.precio)}. ${p.descripcion}. Stock: ${p.stock > 0 ? p.stock + ' unidades' : 'agotado'}. Compra en Tienda con tu correo registrado.`;
        }
    }
    const base = 'Puedo ayudarte con:\n• Servicios';
    if (!v)
        return base + '\n• Primero dime: ¿Automóvil, Camioneta o Moto?';
    return base + '\n• Cotización con precios\n• Horarios: 10:00 a.m. y 2:00 p.m.\n• Cómo agendar una cita\n\nEjemplo: "¿Qué servicios tienen?"';
}
export function invalidateChatbotCache() {
    cache = null;
}
