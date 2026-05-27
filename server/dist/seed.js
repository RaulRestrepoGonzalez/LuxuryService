import bcrypt from 'bcryptjs';
import { connectDb } from './db.js';
import { SERVICIOS_LUXURY } from './servicios-data.js';
const TERMINOS_VERSION = '1.0.0-2026';
const POLITICA_VERSION = '1.0.0-2026';
async function seed() {
    const database = await connectDb();
    await database.dropDatabase();
    const adminHash = await bcrypt.hash('Admin123!', 10);
    await database.collection('usuarios').insertOne({
        nombre: 'Administrador', email: 'admin@luxuryservice.co', rol: 'admin',
        password_hash: adminHash, acepta_terminos: true, consentimiento_datos: true,
        fecha_aceptacion_terminos: new Date(), version_terminos: TERMINOS_VERSION,
        version_politica: POLITICA_VERSION, created_at: new Date()
    });
    await database.collection('servicios').insertMany(SERVICIOS_LUXURY.map(s => ({
        nombre: s.nombre,
        descripcion: s.descripcion,
        categoria: s.categoria,
        subcategoria: s.subcategoria ?? null,
        items: s.items ?? [],
        precio_base: s.precio_auto,
        precio_auto: s.precio_auto,
        precio_camioneta: s.precio_camioneta,
        iva_incluido: true,
        duracion_minutos: s.duracion_minutos,
        agendable: s.agendable,
        activo: true,
        icono: s.icono,
        imagen_url: s.imagen_url,
        color: '#ff2b2b',
        orden: s.orden,
        cotizar_local: s.cotizar_local ?? false,
        created_at: new Date()
    })));
    await database.collection('productos').insertMany([
        { nombre: 'Aceite sintético 5W-30', descripcion: 'Alto rendimiento', precio: 95000, stock: 24, categoria: 'Lubricantes', icono: 'water_drop', created_at: new Date() },
        { nombre: 'Filtro de aceite', descripcion: 'Estándar', precio: 28000, stock: 40, categoria: 'Repuestos', icono: 'filter_alt', created_at: new Date() },
        { nombre: 'Cera nanocerámica', descripcion: 'Protección pintura', precio: 120000, stock: 12, categoria: 'Detailing', icono: 'auto_awesome', created_at: new Date() }
    ]);
    await database.collection('notificaciones').createIndex({ usuario_id: 1, created_at: -1 });
    await database.collection('servicios').createIndex({ categoria: 1, orden: 1 });
    console.log(`\n✓ Seed: ${SERVICIOS_LUXURY.length} servicios · Precios 2026 IVA incluido`);
    console.log('  Admin: admin@luxuryservice.co / Admin123!\n');
    process.exit(0);
}
seed().catch(err => { console.error(err); process.exit(1); });
