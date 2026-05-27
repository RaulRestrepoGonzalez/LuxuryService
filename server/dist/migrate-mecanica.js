/**
 * Migración: combina servicios de mecánica en "Mecánica General"
 *
 * Detecta servicios mecánicos dentro de General y otras categorías.
 * Excluye: lavado, limpieza, detailing, tint, polishing, anticorrosivos,
 *          latonería, pintura, suministros, parqueo.
 *
 * Crea: Mecánica General (cotizar_local: true, precio 0)
 *
 * Uso: npx tsx src/migrate-mecanica.ts
 */
import { connectDb } from './db.js';
const MECHANICAL = [
    'AJUSTE DE CAJETA', 'AJUSTE DE EXTENSION PLASTICA', 'AJUSTE',
    'ALINEACION', 'ANALISIS CON SCANER',
    'BALANCEO', 'CALIBRACION',
    'CAMBIO CONDENSADOR', 'CAMBIO CONTRACAJETA',
    'CAMBIO DE ACEITE', 'CAMBIO DE BATERIA', 'CAMBIO DE BOMBILLO',
    'CAMBIO DE CAJA DE DIRRECION', 'CAMBIO DE CAJETAS', 'CAMBIO DE EMPAQUE',
    'CAMBIO DE PASTILLAS', 'CAMBIO DE VIDRIO',
    'CAMBIOS DE AMORTIGUADORES', 'CAMBIO DE EXPLORADORA',
    'DESMONTE', 'DESTRABE',
    'DIAGNOSTICO', 'DIAGNÓSTICO',
    'INSTALACION', 'INSTALACIÓN',
    'LLANTERIA',
    'MANO DE OBRA', 'MANO OBRA',
    'MANTENIMIENTO',
    'MONTAJE',
    'PROGRAMACION', 'PROGRAMACIÓN',
    'RECTIFICADORA',
    'REPARACION AIRE', 'REPARACION ALTERNADOR',
    'REPARACION DE ELEVA', 'REPARACION DE MOFLE',
    'REPARACION DE PLATON',
    'REPARACION PROTECTOR PLASTICO',
    'REPARACION SOPORTE', 'REPARACION TREN',
    'REPARACION VIDRIO', 'REPARACION Y MANTENIMIENTO ARRANQUE',
    'REPARCAION DE VENTILADOR',
    'REVISION', 'REVISIÓN',
    'SERVICIO DE PRENSA', 'SERVICIO DE SCANNER',
    'SERVICIOS DE LABORATORIO', 'SERVICIOS DE VALVULAS',
    'SINCRONIZACION', 'SINCRONIZACIÓN',
    'UNIDO Y SELLADO DE RINES',
    'ROTACION', 'ROTACIÓN',
    'REFUERZO DE SOPORTES', 'LIMPIEZA DE INYECTORES',
];
const EXCLUDE = [
    'CAMBIO DE TAPICERIA', 'CAMBIO COLA DE GUARDABARRO',
    'CAMBIO ESTRIBO', 'CAMBIO SOPORTE PISO',
    'REPARACION BOMPER', 'REPARACION COSTADO',
    'REPARACION DE ESTRIBO', 'REPARACION PISO INTERNO',
    'REP PUERTA',
    'LAVADO', 'COMBO 5', 'COMBO  -',
    'LIMPIEZA ADICIONAL', 'LIMPIEZA DE PISO', 'LIMPIEZA DE TAPICERIA',
    'LIMPIEZA COJINERIA',
    'LAVADO',
    'POLARIZADO', 'POLICHADA', 'PULIDO', 'REMOCION', 'HIDROBLASTING',
    'RETOQUE', 'DETAILING', 'NANOCERAMICO', 'OTROS DETAILING',
    'DESCONTAMINACION', 'DESCONTAMINADO', 'ADICIONAL LAVADO',
    'PARQUEO', 'SERVICIO A DOMICILIO', 'DESENGRASANTE',
    'INSUMO', 'REPUESTO', 'GRASA', 'ABRAZADERAS',
    'CARGA DE NITROGENO', 'APLICACION DE WD40', 'APLICACION SPRAY W40',
    'Pintura y Acabados', 'Latonería y Carrocería', 'Mecánica General',
];
function isMechanical(name) {
    const upper = name.toUpperCase();
    // Check mechanical keywords first (specific matches override excludes)
    for (const kw of MECHANICAL) {
        if (upper.startsWith(kw) || upper.includes(kw)) {
            // But still exclude known non-mechanical services
            for (const ex of EXCLUDE) {
                if (upper.startsWith(ex) || upper.includes(ex))
                    return false;
            }
            return true;
        }
    }
    return false;
}
async function migrate() {
    const database = await connectDb();
    const col = database.collection('servicios');
    const existing = await col.countDocuments({ nombre: 'Mecánica General' });
    if (existing > 0) {
        console.log('[MECANICA] Ya existe "Mecánica General". Nada que migrar.');
        process.exit(0);
    }
    const all = await col.find({ activo: true }).project({ nombre: 1, categoria: 1 }).toArray();
    const toDelete = all
        .filter(d => isMechanical(d.nombre))
        .filter(d => d.nombre !== 'Pintura y Acabados' && d.nombre !== 'Latonería y Carrocería');
    if (toDelete.length === 0) {
        console.log('[MECANICA] No se encontraron servicios de mecánica para migrar.');
    }
    else {
        console.log('[MECANICA] Eliminando ' + toDelete.length + ' servicios:');
        for (const d of toDelete)
            console.log(`  · ${d.nombre} (${d.categoria})`);
        await col.deleteMany({ _id: { $in: toDelete.map(d => d._id) } });
        console.log(`[MECANICA] ${toDelete.length} servicios eliminados.`);
    }
    const maxOrden = await col.find().sort({ orden: -1 }).limit(1).toArray();
    const orden = maxOrden.length ? maxOrden[0].orden + 1 : 50;
    await col.insertOne({
        nombre: 'Mecánica General',
        descripcion: 'Mantenimiento preventivo y correctivo: frenos, suspensión, motor, transmisión, A/C, dirección, diagnóstico, alineación, balanceo y más. El valor varía según el tipo de vehículo y la reparación requerida. Cotizar en el local.',
        categoria: 'Mecánica',
        items: [],
        precio_base: 0,
        precio_auto: 0,
        precio_camioneta: 0,
        precio_moto: 0,
        iva_incluido: true,
        duracion_minutos: 0,
        agendable: false,
        activo: true,
        icono: 'build',
        imagen_url: '',
        color: '#ff2b2b',
        orden,
        cotizar_local: true,
        created_at: new Date(),
    });
    console.log('[MECANICA] ✓ Creado "Mecánica General" con cotizar_local.');
    process.exit(0);
}
migrate().catch(err => { console.error(err); process.exit(1); });
