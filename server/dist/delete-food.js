import { connectDb } from './db.js';
import { isFoodProduct } from './food-filter.js';
async function main() {
    const db = await connectDb();
    const prods = await db.collection('productos').find({}).toArray();
    const foodItems = prods.filter(p => isFoodProduct(p.nombre, p.descripcion || ''));
    console.log(`Productos de cafetería encontrados: ${foodItems.length}\n`);
    for (const f of foodItems) {
        console.log(`  • ${f.nombre.padEnd(50)} (prov: ${f.descripcion || '?'}) stock: ${f.stock}`);
    }
    const names = foodItems.map(f => f.nombre);
    if (names.length > 0) {
        if (process.argv.includes('--confirm')) {
            const r = await db.collection('productos').deleteMany({ nombre: { $in: names } });
            console.log(`\n→ ${r.deletedCount} productos eliminados de la BD`);
        }
        else {
            console.log('\n→ Pasa --confirm para eliminar');
        }
    }
    else {
        console.log('\nNo hay productos de cafetería que eliminar');
    }
    const restantes = await db.collection('productos').countDocuments();
    const conStock = await db.collection('productos').countDocuments({ stock: { $gt: 0 } });
    console.log(`\nProductos restantes: ${restantes} (${conStock} con stock)`);
    process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
