import { connectDb, getDb } from './db.js';

async function main() {
  await connectDb();
  const db = getDb();
  const ExcelJS = (await import('exceljs')).default;
  const wb = await new ExcelJS.Workbook().xlsx.readFile('/home/raul/Descargas/LISTADO PRODUCTO Y SERVICIOS A MAYO.xlsx');

  const productosMap = new Map<string, { proveedor: string; precio: number; stock: number; clase: string }>();
  const serviciosMap = new Map<string, { proveedor: string; precio: number; clase: string }>();

  for (const ws of wb.worksheets) {
    const isProductos = ws.name.trim().toLowerCase().startsWith('productos');
    ws.eachRow((row, r) => {
      if (r === 1) return;
      const proveedor = String(row.getCell(1).text).trim();
      const producto = String(row.getCell(2).text).trim();
      const tipo = String(row.getCell(3).text).trim();
      const clase = String(row.getCell(4).text).trim();
      const valorVenta = parseFloat(String(row.getCell(5).text).replace(/[^0-9.]/g, '')) || 0;
      const existencia = isProductos ? parseFloat(String(row.getCell(6).text).replace(/[^0-9.]/g, '')) || 0 : 0;

      if (!producto) return;

      if (tipo === 'PROD') {
        const existing = productosMap.get(producto);
        if (existing) {
          if (isProductos && row.getCell(6).text) existing.stock = existencia;
          if (!existing.precio) existing.precio = valorVenta;
        } else {
          productosMap.set(producto, { proveedor, precio: valorVenta, stock: existencia, clase });
        }
      } else if (tipo === 'SERV') {
        const existing = serviciosMap.get(producto);
        if (!existing || !existing.precio) {
          serviciosMap.set(producto, { proveedor, precio: valorVenta, clase });
        }
      }
    });
  }

  console.log(`Productos a procesar: ${productosMap.size}`);
  console.log(`Servicios a procesar: ${serviciosMap.size}`);

  // Clean existing data before inserting fresh
  const delProd = await db.collection('productos').deleteMany({});
  const delServ = await db.collection('servicios').deleteMany({});
  console.log(`Limpieza: ${delProd.deletedCount} productos, ${delServ.deletedCount} servicios eliminados`);

  // Upsert: update existing by nombre, insert new ones
  let prodInserted = 0, prodUpdated = 0;
  for (const [nombre, data] of productosMap) {
    const existing = await db.collection('productos').findOne({ nombre });
    const doc = {
      nombre,
      descripcion: `Proveedor: ${data.proveedor}`,
      categoria: data.clase || 'General',
      precio: data.precio,
      stock: data.stock,
      icono: 'inventory_2',
      color: '#4285F4',
      activo: true,
      created_at: new Date()
    };
    if (existing) {
      await db.collection('productos').updateOne({ _id: existing._id }, { $set: doc });
      prodUpdated++;
    } else {
      await db.collection('productos').insertOne(doc);
      prodInserted++;
    }
  }
  console.log(`Productos: ${prodInserted} insertados, ${prodUpdated} actualizados`);

  let servInserted = 0, servUpdated = 0;
  for (const [nombre, data] of serviciosMap) {
    const existing = await db.collection('servicios').findOne({ nombre });
    const doc = {
      nombre,
      descripcion: `Proveedor: ${data.proveedor}`,
      categoria: data.clase === 'AUTOMOVIL' ? 'Servicios Básicos' : data.clase === 'CAMIONETA' ? 'Servicios Detailing' : 'General',
      subcategoria: data.clase,
      items: [],
      precio_auto: data.precio,
      precio_camioneta: Math.round(data.precio * 1.15),
      precio_base: data.precio,
      iva_incluido: true,
      duracion_minutos: 60,
      agendable: true,
      icono: 'auto_awesome',
      imagen_url: '',
      color: '#ff2b2b',
      orden: 99,
      activo: true,
      created_at: new Date()
    };
    if (existing) {
      await db.collection('servicios').updateOne({ _id: existing._id }, { $set: doc });
      servUpdated++;
    } else {
      await db.collection('servicios').insertOne(doc);
      servInserted++;
    }
  }
  console.log(`Servicios: ${servInserted} insertados, ${servUpdated} actualizados`);

  console.log('Migración completada');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });