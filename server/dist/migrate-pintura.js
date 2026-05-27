/**
 * Migración: combina todos los servicios de pintura en "Pintura y Acabados"
 *
 * Elimina servicios cuyo nombre contiene PINTURA (case-insensitive),
 * más BRILLADA CON CORRECCIÓN, DESCONTAMINADO DE PINTURA,
 * TRATAMIENTO NANO CERÁMICO, PROTECCIÓN ANTICORROSIVA.
 *
 * Crea: Pintura y Acabados (cotizar_local: true, precio 0)
 *
 * Uso: npx tsx src/migrate-pintura.ts
 */
import { connectDb } from './db.js';
const PAINT_REGEX = /PINTURA|BRILLADA CON CORRECCION|DESCONTAMINADO DE PINTURA|TRATAMIENTO NANO CERAMICO|PROTECCION ANTICORROSIVA/i;
async function migrate() {
    const database = await connectDb();
    const col = database.collection('servicios');
    const existing = await col.countDocuments({ nombre: 'Pintura y Acabados' });
    if (existing > 0) {
        console.log('[PINTURA] Ya existe "Pintura y Acabados". Nada que migrar.');
        process.exit(0);
    }
    const toDelete = await col.find({ nombre: PAINT_REGEX }).project({ nombre: 1 }).toArray();
    if (toDelete.length === 0) {
        console.log('[PINTURA] No se encontraron servicios de pintura para migrar.');
    }
    else {
        console.log('[PINTURA] Eliminando:');
        for (const d of toDelete)
            console.log(`  · ${d.nombre}`);
        await col.deleteMany({ _id: { $in: toDelete.map(d => d._id) } });
        console.log(`[PINTURA] ${toDelete.length} servicios eliminados.`);
    }
    const maxOrden = await col.find().sort({ orden: -1 }).limit(1).toArray();
    const orden = maxOrden.length ? maxOrden[0].orden + 1 : 50;
    await col.insertOne({
        nombre: 'Pintura y Acabados',
        descripcion: 'Corrección de brillo, descontaminado de pintura, tratamiento nanocerámico y pintura anticorrosiva. El valor varía según el tipo y estado de la pintura del vehículo. Cotizar en el local.',
        categoria: 'Pintura',
        items: [],
        precio_base: 0,
        precio_auto: 0,
        precio_camioneta: 0,
        precio_moto: 0,
        iva_incluido: true,
        duracion_minutos: 0,
        agendable: false,
        activo: true,
        icono: 'format_paint',
        imagen_url: '',
        color: '#ff2b2b',
        orden,
        cotizar_local: true,
        created_at: new Date(),
    });
    console.log('[PINTURA] ✓ Creado "Pintura y Acabados" con cotizar_local.');
    process.exit(0);
}
migrate().catch(err => { console.error(err); process.exit(1); });
