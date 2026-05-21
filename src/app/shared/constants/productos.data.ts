import { Producto } from 'src/app/modules/public/pages/shop/shop.component';

export const FALLBACK_PRODUCTOS: Producto[] = [
  { id: 'prod-01', nombre: 'Aceite sintético 5W-30', descripcion: 'Alto rendimiento', precio: 95000, stock: 24, categoria: 'Lubricantes', icono: 'water_drop' },
  { id: 'prod-02', nombre: 'Filtro de aceite', descripcion: 'Estándar', precio: 28000, stock: 40, categoria: 'Repuestos', icono: 'filter_alt' },
  { id: 'prod-03', nombre: 'Cera nanocerámica', descripcion: 'Protección pintura', precio: 120000, stock: 12, categoria: 'Detailing', icono: 'auto_awesome' },
  { id: 'prod-04', nombre: 'Lavado Completo Premium', descripcion: 'Lavado exterior e interior completo', precio: 65000, stock: 99, categoria: 'Lavado', icono: 'local_car_wash' },
  { id: 'prod-05', nombre: 'Ambientador automotriz', descripcion: 'Fragancia duradera', precio: 15000, stock: 50, categoria: 'Accesorios', icono: 'air_freshener' },
  { id: 'prod-06', nombre: 'Paño de microfibra', descripcion: 'Set x3 paños', precio: 22000, stock: 35, categoria: 'Accesorios', icono: 'cleaning_services' },
];

export function groupByCategoriaProductos(list: Producto[]): { categorias: string[]; grouped: Record<string, Producto[]> } {
  const grouped: Record<string, Producto[]> = {};
  for (const p of list) {
    const cat = p.categoria || 'Otros';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(p);
  }
  const categorias = Object.keys(grouped);
  return { categorias, grouped };
}
