/** Tarifario Luxury Service Manga — Precios 2026 IVA incluido */

export interface ServicioSeed {
  nombre: string;
  descripcion: string;
  categoria: string;
  subcategoria?: string;
  items?: string[];
  precio_auto: number;
  precio_camioneta: number;
  precio_moto?: number;
  duracion_minutos: number;
  agendable: boolean;
  icono: string;
  imagen_url: string;
  orden: number;
  cotizar_local?: boolean;
}

const P = 'https://images.unsplash.com/photo-';
const S = '?w=400&q=75';

const WASH = P + '1744705626568-0f153efe1ec4' + S;
const ENGINE = P + '1625047509248-ec889cbff17f' + S;
const STEAM = P + '1520340356584-f9917d1eea6f' + S;
const WAX = P + '1620584898989-d39f7f9ed1b7' + S;
const WAX_MACHINE = P + '1708805282695-ef186db20192' + S;
const GRAPHITE = P + '1776261761989-b66436309302' + S;
const CORRECT = P + '1746079074370-f03467da3394' + S;
const DECONTAM = P + '1528597469186-bddab681a37f' + S;
const ROOF = P + '1605437241278-c1806d14a4d9' + S;
const DASH = P + '1632655806671-a4af7ad1bcdc' + S;
const WHEEL = P + '1627503292266-ae49ce45990e' + S;
const HEADLIGHT = P + '1549207107-2704df6b92ab' + S;
const SCRATCH = P + '1779226347538-ca1a725ae550' + S;
const LEATHER = P + '1608259243654-70c070e0f6ed' + S;
const LUXURY = P + '1696841750267-a66619910b62' + S;
const INTERIOR = P + '1487754180451-c456f719a1fc' + S;
const NANO = P + '1617788138017-80ad40651399' + S;
const RUST = P + '1542284530-c2eaee96fc98' + S;
const HOT = P + '1503376780353-7e6692767b70' + S;
const UNDER = P + '1765903916132-7d2fa8ad4c66' + S;
const G1 = P + '1486262715619-67b85e0b08d3' + S;
const G2 = P + '1504384308090-c894fdcc538d' + S;
const G3 = P + '1492144534655-ae79c964c9d7' + S;
const G4 = P + '1580674285054-bed31e145f59' + S;
const G5 = P + '1619642751034-765dfdf7c58e' + S;

export const SERVICIOS_LUXURY: ServicioSeed[] = [
  { nombre: 'Lavado General Express', categoria: 'Servicios Básicos', descripcion: 'Lavado exterior express', precio_auto: 45000, precio_camioneta: 50000, duracion_minutos: 40, agendable: true, icono: 'local_car_wash', imagen_url: WASH, orden: 1 },
  { nombre: 'Lavado de Motor Express', categoria: 'Servicios Básicos', descripcion: 'Limpieza express de motor', precio_auto: 40000, precio_camioneta: 45000, duracion_minutos: 35, agendable: true, icono: 'local_car_wash', imagen_url: ENGINE, orden: 2 },
  { nombre: 'Lavado Motor a Vapor', categoria: 'Servicios Básicos', descripcion: 'Lavado de motor con vapor', precio_auto: 70000, precio_camioneta: 90000, duracion_minutos: 50, agendable: true, icono: 'local_car_wash', imagen_url: STEAM, orden: 3 },
  { nombre: 'Encerado Cleaner Wash Básico', categoria: 'Servicios Básicos', descripcion: 'Encerado básico cleaner wash', precio_auto: 40000, precio_camioneta: 50000, duracion_minutos: 40, agendable: true, icono: 'auto_awesome', imagen_url: WAX, orden: 4 },
  { nombre: 'Encerado Cleaner Wash con Máquina', categoria: 'Servicios Básicos', descripcion: 'Encerado con máquina', precio_auto: 70000, precio_camioneta: 80000, duracion_minutos: 50, agendable: true, icono: 'auto_awesome', imagen_url: WAX_MACHINE, orden: 5 },
  { nombre: 'Grafitado por 1/4', categoria: 'Servicios Básicos', descripcion: 'Grafitado de motor por cuarto', precio_auto: 25000, precio_camioneta: 25000, duracion_minutos: 20, agendable: true, icono: 'build', imagen_url: GRAPHITE, orden: 6 },

  { nombre: 'Combo 1', categoria: 'Combos', descripcion: 'Lavado General + Lavado Motor', items: ['Lavado General', 'Lavado Motor'], precio_auto: 76000, precio_camioneta: 89000, duracion_minutos: 60, agendable: true, icono: 'local_car_wash', imagen_url: G1, orden: 10 },
  { nombre: 'Combo 2', categoria: 'Combos', descripcion: 'Lavado General + Encerado + Hidratación Partes Negras', items: ['Lavado General', 'Encerado', 'Hidratación partes negras'], precio_auto: 76000, precio_camioneta: 89000, duracion_minutos: 75, agendable: true, icono: 'local_car_wash', imagen_url: G2, orden: 11 },
  { nombre: 'Combo 3', categoria: 'Combos', descripcion: 'Lavado General + Motor + Encerado', items: ['Lavado General', 'Motor', 'Encerado'], precio_auto: 108000, precio_camioneta: 121000, duracion_minutos: 90, agendable: true, icono: 'local_car_wash', imagen_url: G3, orden: 12 },
  { nombre: 'Combo 4', categoria: 'Combos', descripcion: 'Lavado General + Encerado + Lavado Motor a Vapor', items: ['Lavado General', 'Encerado', 'Motor a vapor'], precio_auto: 140000, precio_camioneta: 172000, duracion_minutos: 120, agendable: true, icono: 'local_car_wash', imagen_url: STEAM, orden: 13 },

  { nombre: 'Pintura y Acabados', categoria: 'Pintura', descripcion: 'Corrección de brillo, descontaminado de pintura, tratamiento nanocerámico y pintura anticorrosiva. El valor varía según el tipo y estado de la pintura del vehículo. Cotizar en el local.', precio_auto: 0, precio_camioneta: 0, duracion_minutos: 0, agendable: false, icono: 'format_paint', imagen_url: CORRECT, orden: 20, cotizar_local: true },
  { nombre: 'Limpieza de Techo', categoria: 'Servicios Detailing', descripcion: 'Limpieza profunda de techo interior', duracion_minutos: 60, agendable: true, precio_auto: 110000, precio_camioneta: 130000, icono: 'cleaning_services', imagen_url: ROOF, orden: 22 },
  { nombre: 'Limpieza e Hidratación de Carteras y Tableros', categoria: 'Servicios Detailing', descripcion: 'Cuidado de cuero y tablero', precio_auto: 190000, precio_camioneta: 230000, duracion_minutos: 90, agendable: true, icono: 'cleaning_services', imagen_url: DASH, orden: 23 },
  { nombre: 'Limpieza, Descontaminación, Pulido y Sellado por Rin', categoria: 'Servicios Detailing', descripcion: 'Tratamiento completo por rin', precio_auto: 195000, precio_camioneta: 204000, duracion_minutos: 75, agendable: true, icono: 'tire_repair', imagen_url: WHEEL, orden: 24 },
  { nombre: 'Limpieza Pulido y Sellado de Faros', categoria: 'Servicios Detailing', descripcion: 'Restauración de farolas', precio_auto: 140000, precio_camioneta: 130000, duracion_minutos: 60, agendable: true, icono: 'highlight', imagen_url: HEADLIGHT, orden: 25 },
  { nombre: 'Corrección Leve de Rayones por Piezas', categoria: 'Servicios Detailing', descripcion: 'Corrección por pieza', precio_auto: 76000, precio_camioneta: 105000, duracion_minutos: 45, agendable: true, icono: 'auto_awesome', imagen_url: SCRATCH, orden: 26 },
  { nombre: 'Descontaminado e Hidratación de Carteras y Tableros', categoria: 'Servicios Detailing', descripcion: 'Descontaminado + hidratación', precio_auto: 190000, precio_camioneta: 230000, duracion_minutos: 90, agendable: true, icono: 'cleaning_services', imagen_url: LEATHER, orden: 27 },
  { nombre: 'Combo Luxury', categoria: 'Servicios Detailing', subcategoria: 'COMBO',
    descripcion: 'Lavado tapicería, carteras, tableros, techo, piso, motor, rines, llantas y super brillo',
    items: ['Tapicería', 'Carteras', 'Tableros', 'Techo', 'Piso', 'Motor', 'Rines', 'Llantas', 'Super brillo'],
    precio_auto: 764000, precio_camioneta: 891000, duracion_minutos: 480, agendable: true, icono: 'auto_awesome', imagen_url: LUXURY, orden: 28 },
  { nombre: 'Limpieza de Tapicería e Interior sin Desmonte', categoria: 'Servicios Detailing', descripcion: 'Interior completo sin desmonte', precio_auto: 450000, precio_camioneta: 510000, duracion_minutos: 180, agendable: true, icono: 'cleaning_services', imagen_url: INTERIOR, orden: 29 },
  { nombre: 'Limpieza de Tapicería e Interior con Desmonte', categoria: 'Servicios Detailing', descripcion: 'Interior completo con desmonte', precio_auto: 510000, precio_camioneta: 573000, duracion_minutos: 240, agendable: true, icono: 'cleaning_services', imagen_url: G4, orden: 30 },
  { nombre: 'Servicio de Agua Caliente', categoria: 'Servicios Anticorrosivos', descripcion: 'Lavado con agua caliente', precio_auto: 390000, precio_camioneta: 390000, duracion_minutos: 90, agendable: true, icono: 'local_car_wash', imagen_url: HOT, orden: 41 },
  { nombre: 'Hidroblasting', categoria: 'Servicios Anticorrosivos', descripcion: 'Hidroblasting de chasis', precio_auto: 1450000, precio_camioneta: 1550000, duracion_minutos: 240, agendable: true, icono: 'local_car_wash', imagen_url: UNDER, orden: 42 },
  { nombre: 'Latonería y Carrocería', categoria: 'Latonería', descripcion: 'Reparación de latonería, enderezada de golpes, reconstrucción de piezas y carrocería en general. El valor varía según el daño y la pieza. Cotizar en el local.', precio_auto: 0, precio_camioneta: 0, duracion_minutos: 0, agendable: false, icono: 'build', imagen_url: '', orden: 50, cotizar_local: true },
];
