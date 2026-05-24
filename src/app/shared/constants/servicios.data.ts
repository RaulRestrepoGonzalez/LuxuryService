export interface Servicio {
  id: string;
  nombre: string;
  descripcion: string;
  duracion_minutos: number;
  precio_base: number;
  precio_auto: number;
  precio_camioneta: number;
  precio_moto?: number;
  categoria?: string;
  subcategoria?: string;
  items?: string[];
  icono?: string;
  imagen_url?: string;
  agendable?: boolean;
  iva_incluido?: boolean;
}

export function groupByCategoria(list: Servicio[]): { categorias: string[]; grouped: Record<string, Servicio[]> } {
  const grouped: Record<string, Servicio[]> = {};
  for (const s of list) {
    const c = s.categoria || 'Otros';
    (grouped[c] ??= []).push(s);
  }
  return { categorias: Object.keys(grouped), grouped };
}

const P = 'https://images.unsplash.com/photo-';
const S = '?w=400&q=75';

const WASH = P + '1744705626568-0f153efe1ec4' + S;
const ENGINE = P + '1625047509248-ec889cbff17f' + S;
const STEAM = P + '1520340356584-f9917d1eea6f' + S;
const WAX = P + '1620584898989-d39f7f9ed1b7' + S;
const GRAPHITE = P + '1776261761989-b66436309302' + S;
const POLISH_MACHINE = P + '1708805282695-ef186db20192' + S;
const PAINT_CORRECT = P + '1746079074370-f03467da3394' + S;
const PAINT_PROTECT = P + '1528597469186-bddab681a37f' + S;
const INTERIOR = P + '1605437241278-c1806d14a4d9' + S;
const DASH = P + '1632655806671-a4af7ad1bcdc' + S;
const WHEEL = P + '1627503292266-ae49ce45990e' + S;
const HEADLIGHT = P + '1549207107-2704df6b92ab' + S;
const SCRATCH = P + '1779226347538-ca1a725ae550' + S;
const UPHOLSTERY = P + '1608259243654-70c070e0f6ed' + S;
const WORKSHOP = P + '1696841750267-a66619910b62' + S;
const RUST = P + '1542284530-c2eaee96fc98' + S;
const UNDER = P + '1765903916132-7d2fa8ad4c66' + S;
const DETAIL1 = P + '1486262715619-67b85e0b08d3' + S;
const DETAIL2 = P + '1504384308090-c894fdcc538d' + S;
const DETAIL3 = P + '1487754180451-c456f719a1fc' + S;
const DETAIL4 = P + '1492144534655-ae79c964c9d7' + S;
const NANO = P + '1617788138017-80ad40651399' + S;
const HOT_WATER = P + '1503376780353-7e6692767b70' + S;

export const FALLBACK_SERVICIOS: Servicio[] = [
  { id: 'fb-01', nombre: 'Lavado General Express', descripcion: 'Lavado exterior express', duracion_minutos: 40, precio_base: 45000, precio_auto: 45000, precio_camioneta: 50000, categoria: 'Servicios Básicos', icono: 'local_car_wash', imagen_url: WASH, agendable: true, iva_incluido: true },
  { id: 'fb-02', nombre: 'Lavado de Motor Express', descripcion: 'Limpieza express de motor', duracion_minutos: 35, precio_base: 40000, precio_auto: 40000, precio_camioneta: 45000, categoria: 'Servicios Básicos', icono: 'local_car_wash', imagen_url: ENGINE, agendable: true, iva_incluido: true },
  { id: 'fb-03', nombre: 'Lavado Motor a Vapor', descripcion: 'Lavado de motor con vapor', duracion_minutos: 50, precio_base: 70000, precio_auto: 70000, precio_camioneta: 90000, categoria: 'Servicios Básicos', icono: 'local_car_wash', imagen_url: STEAM, agendable: true, iva_incluido: true },
  { id: 'fb-04', nombre: 'Encerado Cleaner Wash', descripcion: 'Encerado básico', duracion_minutos: 40, precio_base: 40000, precio_auto: 40000, precio_camioneta: 50000, categoria: 'Servicios Básicos', icono: 'auto_awesome', imagen_url: WAX, agendable: true, iva_incluido: true },
  { id: 'fb-05', nombre: 'Grafitado por 1/4', descripcion: 'Grafitado de motor', duracion_minutos: 20, precio_base: 25000, precio_auto: 25000, precio_camioneta: 25000, categoria: 'Servicios Básicos', icono: 'build', imagen_url: GRAPHITE, agendable: true, iva_incluido: true },
  { id: 'fb-06', nombre: 'Combo 1: Lavado + Motor', descripcion: 'Lavado General + Lavado Motor', items: ['Lavado General', 'Lavado Motor'], duracion_minutos: 60, precio_base: 76000, precio_auto: 76000, precio_camioneta: 89000, categoria: 'Combos', icono: 'local_car_wash', imagen_url: DETAIL1, agendable: true, iva_incluido: true },
  { id: 'fb-07', nombre: 'Combo 2: Lavado + Encerado', descripcion: 'Lavado General + Encerado + Hidratación Partes Negras', items: ['Lavado General', 'Encerado', 'Hidratación partes negras'], duracion_minutos: 75, precio_base: 76000, precio_auto: 76000, precio_camioneta: 89000, categoria: 'Combos', icono: 'local_car_wash', imagen_url: DETAIL2, agendable: true, iva_incluido: true },
  { id: 'fb-08', nombre: 'Combo 3: Lavado + Motor + Encerado', descripcion: 'Lavado General + Motor + Encerado', items: ['Lavado General', 'Motor', 'Encerado'], duracion_minutos: 90, precio_base: 108000, precio_auto: 108000, precio_camioneta: 121000, categoria: 'Combos', icono: 'local_car_wash', imagen_url: DETAIL4, agendable: true, iva_incluido: true },
  { id: 'fb-09', nombre: 'Combo 4: Lavado + Encerado + Motor Vapor', descripcion: 'Lavado General + Encerado + Lavado Motor a Vapor', items: ['Lavado General', 'Encerado', 'Motor a vapor'], duracion_minutos: 120, precio_base: 140000, precio_auto: 140000, precio_camioneta: 172000, categoria: 'Combos', icono: 'local_car_wash', imagen_url: STEAM, agendable: true, iva_incluido: true },
  { id: 'fb-10', nombre: 'Brillada con Corrección Leve', descripcion: 'Corrección leve y protección acrílica', duracion_minutos: 180, precio_base: 380000, precio_auto: 380000, precio_camioneta: 445000, categoria: 'Servicios Detailing', icono: 'auto_awesome', imagen_url: PAINT_CORRECT, agendable: true, iva_incluido: true },
  { id: 'fb-11', nombre: 'Descontaminado de Pintura', descripcion: 'Descontaminado químico y físico', duracion_minutos: 120, precio_base: 230000, precio_auto: 230000, precio_camioneta: 295000, categoria: 'Servicios Detailing', icono: 'auto_awesome', imagen_url: PAINT_PROTECT, agendable: true, iva_incluido: true },
  { id: 'fb-12', nombre: 'Limpieza de Techo', descripcion: 'Limpieza profunda de techo interior', duracion_minutos: 60, precio_base: 110000, precio_auto: 110000, precio_camioneta: 130000, categoria: 'Servicios Detailing', icono: 'cleaning_services', imagen_url: INTERIOR, agendable: true, iva_incluido: true },
  { id: 'fb-13', nombre: 'Tratamiento Nano Cerámico', descripcion: 'Protección nanocerámica premium', duracion_minutos: 360, precio_base: 1300000, precio_auto: 1300000, precio_camioneta: 1400000, categoria: 'Servicios Detailing', icono: 'auto_awesome', imagen_url: WORKSHOP, agendable: true, iva_incluido: true },
  { id: 'fb-14', nombre: 'Pintura Anticorrosiva', descripcion: 'Protección y pintura anticorrosiva', duracion_minutos: 480, precio_base: 1450000, precio_auto: 1450000, precio_camioneta: 1550000, categoria: 'Servicios Anticorrosivos', icono: 'format_paint', imagen_url: RUST, agendable: true, iva_incluido: true },
  { id: 'fb-15', nombre: 'Servicio de Agua Caliente', descripcion: 'Lavado con agua caliente', duracion_minutos: 90, precio_base: 390000, precio_auto: 390000, precio_camioneta: 390000, categoria: 'Servicios Anticorrosivos', icono: 'local_car_wash', imagen_url: HOT_WATER, agendable: true, iva_incluido: true },
  { id: 'fb-16', nombre: 'Hidroblasting', descripcion: 'Hidroblasting de chasis', duracion_minutos: 240, precio_base: 1450000, precio_auto: 1450000, precio_camioneta: 1550000, categoria: 'Servicios Anticorrosivos', icono: 'local_car_wash', imagen_url: UNDER, agendable: true, iva_incluido: true },
  { id: 'fb-17', nombre: 'Limpieza de Tapicería', descripcion: 'Interior completo sin desmonte', duracion_minutos: 180, precio_base: 450000, precio_auto: 450000, precio_camioneta: 510000, categoria: 'Servicios Detailing', icono: 'cleaning_services', imagen_url: UPHOLSTERY, agendable: true, iva_incluido: true },
  { id: 'fb-18', nombre: 'Limpieza e Hidratación de Carteras', descripcion: 'Cuidado de cuero y tablero', duracion_minutos: 90, precio_base: 190000, precio_auto: 190000, precio_camioneta: 230000, categoria: 'Servicios Detailing', icono: 'cleaning_services', imagen_url: DASH, agendable: true, iva_incluido: true },
];
