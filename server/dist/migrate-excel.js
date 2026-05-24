import { connectDb, getDb } from './db.js';
const FOOD_NAMES_RE = /\b(DETODITO|CHOCLITOS|GALLETA|GALLETAS|ORE|OREOS|CHIPS|PAPA|NATUCHIP|NATUCHIPS|ROSQUITA|ROSQUITAS|ACHIRAS|CHEETOS|DORITOS|FRITOLAY|CHOKIS|MANI|MANIMOTO|PANDERITOS|SUSPIROS|YABOLINES|BOLIQUESO|MAMUT|ONDULADA|TORTA|COCADA|LONCHERA|MESCLAS|SURTIDA|SURTIDO|QUAKER|CROK|UVAS|MANANTIAL|BOCADILLO|TRIS|CHEESE|PLATANO|AREQUIPE|LECHE|ABUELITA|CHOCOLATE|COCOSET|PORCIN|PUDIN|PALETA|PALETAS|PALETTA|PALETT|BROWNIE|NUTELLA|COROZO|FERRERO|FRESA|CHOCONUTELLA|MARGARITA|GATORLIT|HIDRA|GOMITA|TROZOS|COCA|COCACOLA|COLA|GASEOSA|SODA|FRESCH|KOLA|ROMAN|GINGER|CANADA|DRIL|QUATRO|CHOICE|PONY|MALTA|GATORADE|MONSTER|ENERGY|RED\s?BULL|HATSU|CITRUS|FUZE|AGUA|ACQUA|BRISA|BRETAÑA|BLUE|ICE|MANZANA|DURAZNO|MARACUYA|MANGO|FRUTOS|ROJOS|VERDES|LIMON|FRUTA|TROPICAL|MORA|KIWI|VAINILLA|SCHWEPPES|H2OH|NECTAR|VITAL|HIDRATACION|BEBIDA|LIMA|MENTA|YOP|VALLE|TEA|AGUILA|CERVEZA|CORONITA|POLA|CLUB|COLOMBIA|CORONA|HEINEKEN|MILLER|LITE|NAL|ROSE|SIX|PASTEL|FRAMB|HIRBABUENAS|SANDI|ALBAHA|CERO|LATA|CAFE|CAFÉ|TINTO|CAPUCCINO|CAPUCHINO|NESCAFE|LATTES|LATTE|COCOSET|COCOSETTE|TRADICIONAL)\b/i;
function isFoodItem(name) {
    return FOOD_NAMES_RE.test(name);
}
/** Normaliza un nombre para comparación: mayúsculas, sin acentos, sin espacios extra */
function normalize(s) {
    return s.toUpperCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
/** Busca en un mapa de nombres normalizados, primero exacto, luego por coincidencia de tokens */
function findMatch(normalized, lookup) {
    // 1. Exact match
    if (lookup.has(normalized))
        return lookup.get(normalized);
    // 2. Token overlap: al menos la mitad de las palabras coinciden
    const tokens = normalized.split(/\s+/);
    if (tokens.length < 2)
        return null;
    let best = null;
    let bestScore = 0;
    for (const [key, doc] of lookup) {
        const keyTokens = key.split(/\s+/);
        let matches = 0;
        for (const t of tokens) {
            if (keyTokens.some((kt) => kt === t || kt.startsWith(t) || t.startsWith(kt))) {
                matches++;
            }
        }
        // Also check inverted
        for (const kt of keyTokens) {
            if (tokens.some((t) => t === kt || t.startsWith(kt) || kt.startsWith(t))) {
                // already counted above, but doesn't hurt
            }
        }
        const score = matches / Math.max(tokens.length, keyTokens.length);
        if (score > bestScore && score >= 0.4) {
            bestScore = score;
            best = doc;
        }
    }
    return best;
}
async function main() {
    await connectDb();
    const db = getDb();
    const ExcelJS = (await import('exceljs')).default;
    const wb = await new ExcelJS.Workbook().xlsx.readFile('/home/raul/Descargas/LISTADO PRODUCTO Y SERVICIOS A MAYO.xlsx');
    // ── Build lookup from DB ──
    const dbProductos = await db.collection('productos').find({}).toArray();
    const dbServicios = await db.collection('servicios').find({}).toArray();
    const prodLookup = new Map();
    for (const doc of dbProductos) {
        prodLookup.set(normalize(doc.nombre), doc);
    }
    const svcLookup = new Map();
    for (const doc of dbServicios) {
        svcLookup.set(normalize(doc.nombre), doc);
    }
    console.log(`DB actual: ${dbProductos.length} productos, ${dbServicios.length} servicios`);
    // ── Read Excel ──
    const excelProds = new Map();
    const excelSvcs = new Map();
    const foodSkipped = [];
    for (const ws of wb.worksheets) {
        const isProductos = ws.name.trim().toLowerCase().startsWith('productos');
        ws.eachRow((row, r) => {
            if (r === 1)
                return;
            const proveedor = String(row.getCell(1).text).trim();
            const nombre = String(row.getCell(2).text).trim();
            const tipo = String(row.getCell(3).text).trim();
            const clase = String(row.getCell(4).text).trim();
            const valorVenta = parseFloat(String(row.getCell(5).text).replace(/[^0-9.]/g, '')) || 0;
            const existencia = isProductos ? parseFloat(String(row.getCell(6).text).replace(/[^0-9.]/g, '')) || 0 : 0;
            if (!nombre || isFoodItem(nombre)) {
                if (nombre && isFoodItem(nombre))
                    foodSkipped.push(nombre);
                return;
            }
            if (tipo === 'PROD') {
                const existing = excelProds.get(nombre);
                if (existing) {
                    if (isProductos && row.getCell(6).text)
                        existing.stock = existencia;
                    if (!existing.precio)
                        existing.precio = valorVenta;
                }
                else {
                    excelProds.set(nombre, { proveedor, precio: valorVenta, stock: existencia, clase });
                }
            }
            else if (tipo === 'SERV') {
                const existing = excelSvcs.get(nombre);
                if (!existing || !existing.precio) {
                    excelSvcs.set(nombre, { proveedor, precio: valorVenta, clase });
                }
            }
        });
    }
    console.log(`Excel: ${excelProds.size} productos, ${excelSvcs.size} servicios (${foodSkipped.length} comida omitida)`);
    // ── Procesar productos ──
    let prodUpdated = 0, prodInserted = 0, prodSkipped = 0, prodFuzzy = 0;
    for (const [nombre, data] of excelProds) {
        const norm = normalize(nombre);
        const match = findMatch(norm, prodLookup);
        const doc = {
            nombre,
            descripcion: `Proveedor: ${data.proveedor}`,
            categoria: data.clase || 'General',
            precio: data.precio,
            stock: data.stock,
        };
        if (match) {
            // Update existing
            const isFuzzy = normalize(match.nombre) !== norm;
            await db.collection('productos').updateOne({ _id: match._id }, { $set: doc });
            prodUpdated++;
            if (isFuzzy) {
                prodFuzzy++;
                console.log(`  ~ "${match.nombre}" ← "${nombre}" (coincidencia aproximada)`);
            }
        }
        else {
            // Insert new
            await db.collection('productos').insertOne({
                ...doc,
                icono: 'inventory_2',
                color: '#4285F4',
                activo: true,
                created_at: new Date(),
            });
            prodInserted++;
        }
    }
    // ── Productos en DB que NO están en Excel ──
    const excelProdNorms = new Set();
    for (const [name] of excelProds)
        excelProdNorms.add(normalize(name));
    for (const [norm, doc] of prodLookup) {
        if (!excelProdNorms.has(norm)) {
            prodSkipped++;
        }
    }
    console.log(`Productos: ${prodUpdated} actualizados (${prodFuzzy} aproximados), ${prodInserted} insertados, ${prodSkipped} en DB no tocados`);
    // ── Procesar servicios ──
    let svcUpdated = 0, svcInserted = 0, svcSkipped = 0, svcFuzzy = 0;
    for (const [nombre, data] of excelSvcs) {
        const norm = normalize(nombre);
        const match = findMatch(norm, svcLookup);
        const categoria = data.clase === 'AUTOMOVIL' ? 'Servicios Básicos' : data.clase === 'CAMIONETA' ? 'Servicios Detailing' : 'General';
        const precioAuto = data.precio;
        const doc = {
            nombre,
            descripcion: `Proveedor: ${data.proveedor}`,
            categoria,
            subcategoria: data.clase,
            precio_auto: precioAuto,
            precio_camioneta: Math.round(precioAuto * 1.15),
            precio_base: precioAuto,
        };
        if (match) {
            const isFuzzy = normalize(match.nombre) !== norm;
            // Preserve existing precio_moto, duracion, items, etc. — only update what Excel provides
            await db.collection('servicios').updateOne({ _id: match._id }, { $set: doc });
            // Also update precio_moto proportionally if not already set
            await db.collection('servicios').updateOne({ _id: match._id, precio_moto: { $exists: false } }, { $set: { precio_moto: Math.round(precioAuto * 0.8) } });
            // Update precio_moto proportionally if it was auto-generated (not manually set by admin)
            // We detect "auto-generated" if precio_moto ≈ 80% of the OLD precio_base
            // This is heuristic; manually-set prices will diverge and won't be overwritten
            // Actually, just don't overwrite precio_moto if it already exists. Keep it.
            svcUpdated++;
            if (isFuzzy) {
                svcFuzzy++;
                console.log(`  ~ "${match.nombre}" ← "${nombre}" (coincidencia aproximada)`);
            }
        }
        else {
            await db.collection('servicios').insertOne({
                ...doc,
                precio_moto: Math.round(precioAuto * 0.8),
                items: [],
                iva_incluido: true,
                duracion_minutos: 60,
                agendable: true,
                icono: 'auto_awesome',
                imagen_url: '',
                color: '#ff2b2b',
                orden: 99,
                activo: true,
                created_at: new Date(),
            });
            svcInserted++;
        }
    }
    // ── Servicios en DB que NO están en Excel ──
    const excelSvcNorms = new Set();
    for (const [name] of excelSvcs)
        excelSvcNorms.add(normalize(name));
    for (const [norm, doc] of svcLookup) {
        if (!excelSvcNorms.has(norm)) {
            svcSkipped++;
        }
    }
    console.log(`Servicios: ${svcUpdated} actualizados (${svcFuzzy} aproximados), ${svcInserted} insertados, ${svcSkipped} en DB no tocados`);
    console.log('Migración completada');
    process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
