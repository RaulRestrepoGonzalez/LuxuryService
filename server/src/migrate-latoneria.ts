/**
 * Migración: combina todos los servicios de latonería en "Latonería y Carrocería"
 *
 * Elimina servicios cuyo nombre contiene LATONERÍA o CARROCERÍA.
 * Crea: Latonería y Carrocería (cotizar_local: true, precio 0)
 *
 * Uso: npx tsx src/migrate-latoneria.ts
 */

import { connectDb } from './db.js';

const REGEX = /LATONERIA|CARROCERIA/i;

async function migrate() {
  const database = await connectDb();
  const col = database.collection('servicios');

  const existing = await col.countDocuments({ nombre: 'Latonería y Carrocería' });
  if (existing > 0) {
    console.log('[LATONERIA] Ya existe "Latonería y Carrocería". Nada que migrar.');
    process.exit(0);
  }

  const toDelete = await col.find({ nombre: REGEX }).project({ nombre: 1 }).toArray();
  if (toDelete.length === 0) {
    console.log('[LATONERIA] No se encontraron servicios de latonería para migrar.');
  } else {
    console.log('[LATONERIA] Eliminando:');
    for (const d of toDelete) console.log(`  · ${d.nombre}`);
    await col.deleteMany({ _id: { $in: toDelete.map(d => d._id) } });
    console.log(`[LATONERIA] ${toDelete.length} servicios eliminados.`);
  }

  const maxOrden = await col.find().sort({ orden: -1 }).limit(1).toArray();
  const orden = maxOrden.length ? (maxOrden[0] as any).orden + 1 : 50;

  await col.insertOne({
    nombre: 'Latonería y Carrocería',
    descripcion: 'Reparación de latonería, enderezada de golpes, reconstrucción de piezas y carrocería en general. El valor varía según el daño y la pieza. Cotizar en el local.',
    categoria: 'Latonería',
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

  console.log('[LATONERIA] ✓ Creado "Latonería y Carrocería" con cotizar_local.');
  process.exit(0);
}

migrate().catch(err => { console.error(err); process.exit(1); });
