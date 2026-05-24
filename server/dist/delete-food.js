import { connectDb, getDb } from './db.js';
const tokenize = (s) => s.toUpperCase().split(/[\s,._\-+\\/]+/).filter(Boolean);
const FOOD_WORDS = new Set([
    'CHOCLITOS', 'CHOCLO', 'GALLETA', 'GALLETAS', 'ORE', 'OREOS', 'CHIPS', 'PAPA',
    'DETODITO', 'NATUCHIP', 'NATUCHIPS', 'ROSQUITA', 'ROSQUITAS', 'ACHIRAS',
    'CHEETOS', 'DORITOS', 'FRITOLAY', 'CHOKIS', 'MANI', 'MANIMOTO',
    'PANDERITOS', 'SUSPIROS', 'YABOLINES', 'BOLIQUESO', 'MAMUT', 'ONDULADA',
    'TORTA', 'COCADA', 'LONCHERA', 'MESCLAS', 'SURTIDA', 'SURTIDO',
    'QUAKER', 'CROK', 'UVAS', 'MANANTIAL', 'BOCADILLO', 'TRIS', 'CHEESE',
    'PLATANO', 'AREQUIPE', 'LECHE', 'ABUELITA', 'CHOCOLATE', 'COCOSET',
    'PORCIN', 'PUDIN', 'PALETA', 'PALETAS', 'PALETTA', 'PALETT',
    'BROWNIE', 'NUTELLA', 'COROZO', 'FERRERO', 'FRESA', 'CHOCONUTELLA',
    'MARGARITA', 'GATORLIT', 'HIDRA', 'GOMITA', 'TROZOS',
]);
const DRINK_WORDS = new Set([
    'COCA', 'COCACOLA', 'COLA', 'GASEOSA', 'SODA', 'FRESCH', 'KOLA',
    'ROMAN', 'GINGER', 'CANADA', 'DRIL', 'QUATRO', 'CHOICE', 'PONY', 'MALTA',
    'GATORADE', 'MONSTER', 'ENERGY', 'RED', 'BULL',
    'HATSU', 'CITRUS', 'FUZE', 'AGUA', 'ACQUA', 'BRISA', 'BRETAÑA',
    'GATORLIT', 'HIDRA', 'BLUE', 'ICE',
    'MANZANA', 'DURAZNO', 'MARACUYA', 'MANGO', 'FRUTOS', 'ROJOS', 'VERDES',
    'LIMON', 'FRUTA', 'TROPICAL', 'MORA', 'KIWI', 'VAINILLA',
    'SCHWEPPES', 'H2OH', 'MR', 'NECTAR', 'VITAL', 'HIDRATACION', 'BEBIDA',
    'LIMA', 'MENTA', 'YOP', 'VALLE', 'TEA',
    'AGUILA', 'CERVEZA', 'CORONITA', 'POLA', 'CLUB', 'COLOMBIA', 'CORONA',
    'HEINEKEN', 'MILLER', 'LITE', 'NAL', 'ROSE', 'SIX', 'PASTEL', 'FRAMB',
    'HIRBABUENAS', 'SANDI', 'ALBAHA', 'CERO', 'LATA',
]);
// Coffee/food keywords — must match as WHOLE words, not substrings
const COFFEE_WORDS = new Set([
    'CAFE', 'CAFÉ', 'TINTO', 'CAPUCCINO', 'CAPUCHINO', 'NESCAFE', 'LATTES', 'LATTE',
    'COCOSET', 'COCOSETTE', 'TRADICIONAL',
]);
const AUTO_WORDS = new Set([
    'LLANTA', 'LLANTAS', 'PLUMILLA', 'PLUMILLAS', 'TERMINAL', 'TERMINALES', 'BOTAS',
    'LUBRISTONE', 'SIMONIZ',
]);
function isFoodProduct(name) {
    const words = tokenize(name);
    // Never delete known auto parts
    if (words.some((w) => AUTO_WORDS.has(w)))
        return false;
    if (name.toUpperCase().includes('PARABRISA') || name.toUpperCase().includes('PARABRISAS'))
        return false;
    if (name.toUpperCase().includes('EXTINTOR'))
        return false;
    if (name.toUpperCase().includes('LATONERIA'))
        return false;
    // Check for food/drink words (word-level only, no substring matching)
    for (const w of words) {
        if (FOOD_WORDS.has(w) || DRINK_WORDS.has(w) || COFFEE_WORDS.has(w))
            return true;
    }
    return false;
}
async function main() {
    await connectDb();
    const db = getDb();
    // ── Products ──
    const allProds = await db.collection('productos').find({}).toArray();
    const toDelete = allProds.filter(p => isFoodProduct(p.nombre));
    console.log(`Productos a eliminar (${toDelete.length}):`);
    for (const d of toDelete) {
        console.log(`  • ${d.nombre}`);
    }
    if (toDelete.length > 0) {
        const names = toDelete.map(d => d.nombre);
        const r = await db.collection('productos').deleteMany({ nombre: { $in: names } });
        console.log(`→ ${r.deletedCount} productos eliminados`);
    }
    // ── Services ──
    const allSvcs = await db.collection('servicios').find({}).toArray();
    const svcToDelete = allSvcs.filter(s => {
        const tokens = tokenize(s.nombre);
        const foodMatch = tokens.some(t => FOOD_WORDS.has(t) || DRINK_WORDS.has(t) || COFFEE_WORDS.has(t));
        // Exclude services with auto-context keywords
        const autoKeywords = ['POLARIZADO', 'LAVADO', 'COMBO', 'LIMPI', 'MANTENIMIENTO',
            'CAMBIO', 'REPARACION', 'PINTURA', 'ADICIONAL', 'ANALISIS', 'SCANER',
            'DESCONTAMINADO', 'HIDRATACION', 'HIDRA', 'LATONERIA', 'ACEITE',
            'GUARDABARRO', 'GUARDABARROS', 'VIDRIO', 'PANORAMICO', 'VENTANAS',
            'MANIJA', 'PUERTA', 'CALIENTE', 'BATERIA', 'AMORTIGUADOR',
            'INYECTOR', 'TAPICERIA', 'CARROCERIA', 'LLANTA', 'LLANTAS',
            'FRENO', 'FRENOS', 'SUSPENSION', 'MOTOR', 'CHASIS', 'CABINA',
            'RIN', 'RINES', 'BOMPER', 'BUMPER', 'PARABRISA', 'PARABRISAS',
            'ESTRIBO', 'DEFENSA', 'FARO', 'FAROS', 'AIRE', 'ACONDICIONADO',
            'MOFLE', 'PLATON', 'FILTRO', 'ALTERNADOR', 'CALIPER',
            'SOLDADURA', 'SENSOR', 'SINCRONIZACION',
        ];
        const hasAuto = tokens.some((t) => autoKeywords.some((k) => t.startsWith(k) || k.startsWith(t)));
        return foodMatch && !hasAuto;
    });
    console.log(`\nServicios a eliminar (${svcToDelete.length}):`);
    for (const d of svcToDelete) {
        console.log(`  • ${d.nombre}`);
    }
    if (svcToDelete.length > 0) {
        const names = svcToDelete.map(d => d.nombre);
        const r = await db.collection('servicios').deleteMany({ nombre: { $in: names } });
        console.log(`→ ${r.deletedCount} servicios eliminados`);
    }
    console.log('\nLimpieza completada');
    process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
