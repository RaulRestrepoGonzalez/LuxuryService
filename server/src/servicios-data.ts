/** Tarifario Luxury Service Manga — Precios 2025 IVA incluido */

export interface ServicioSeed {
  nombre: string;
  descripcion: string;
  categoria: string;
  subcategoria?: string;
  items?: string[];
  precio_auto: number;
  precio_camioneta: number;
  duracion_minutos: number;
  agendable: boolean;
  icono: string;
  orden: number;
}

export const SERVICIOS_LUXURY: ServicioSeed[] = [
  { nombre: 'Lavado General Express', categoria: 'Servicios Básicos', descripcion: 'Lavado exterior express', precio_auto: 45000, precio_camioneta: 50000, duracion_minutos: 40, agendable: true, icono: 'local_car_wash', orden: 1 },
  { nombre: 'Lavado de Motor Express', categoria: 'Servicios Básicos', descripcion: 'Limpieza express de motor', precio_auto: 40000, precio_camioneta: 45000, duracion_minutos: 35, agendable: true, icono: 'local_car_wash', orden: 2 },
  { nombre: 'Lavado Motor a Vapor', categoria: 'Servicios Básicos', descripcion: 'Lavado de motor con vapor', precio_auto: 70000, precio_camioneta: 90000, duracion_minutos: 50, agendable: true, icono: 'local_car_wash', orden: 3 },
  { nombre: 'Encerado Cleaner Wash Básico', categoria: 'Servicios Básicos', descripcion: 'Encerado básico cleaner wash', precio_auto: 40000, precio_camioneta: 50000, duracion_minutos: 40, agendable: true, icono: 'auto_awesome', orden: 4 },
  { nombre: 'Encerado Cleaner Wash con Máquina', categoria: 'Servicios Básicos', descripcion: 'Encerado con máquina', precio_auto: 70000, precio_camioneta: 80000, duracion_minutos: 50, agendable: true, icono: 'auto_awesome', orden: 5 },
  { nombre: 'Grafitado por 1/4', categoria: 'Servicios Básicos', descripcion: 'Grafitado de motor por cuarto', precio_auto: 25000, precio_camioneta: 25000, duracion_minutos: 20, agendable: true, icono: 'build', orden: 6 },

  { nombre: 'Combo 1', categoria: 'Combos', descripcion: 'Lavado General + Lavado Motor', items: ['Lavado General', 'Lavado Motor'], precio_auto: 76000, precio_camioneta: 89000, duracion_minutos: 60, agendable: true, icono: 'local_car_wash', orden: 10 },
  { nombre: 'Combo 2', categoria: 'Combos', descripcion: 'Lavado General + Encerado + Hidratación Partes Negras', items: ['Lavado General', 'Encerado', 'Hidratación partes negras'], precio_auto: 76000, precio_camioneta: 89000, duracion_minutos: 75, agendable: true, icono: 'local_car_wash', orden: 11 },
  { nombre: 'Combo 3', categoria: 'Combos', descripcion: 'Lavado General + Motor + Encerado', items: ['Lavado General', 'Motor', 'Encerado'], precio_auto: 108000, precio_camioneta: 121000, duracion_minutos: 90, agendable: true, icono: 'local_car_wash', orden: 12 },
  { nombre: 'Combo 4', categoria: 'Combos', descripcion: 'Lavado General + Encerado + Lavado Motor a Vapor', items: ['Lavado General', 'Encerado', 'Motor a vapor'], precio_auto: 140000, precio_camioneta: 172000, duracion_minutos: 120, agendable: true, icono: 'local_car_wash', orden: 13 },

  { nombre: 'Brillada con Corrección Leve y Protección Acrílica', categoria: 'Servicios Detailing', descripcion: 'Corrección leve y protección acrílica', precio_auto: 380000, precio_camioneta: 445000, duracion_minutos: 180, agendable: true, icono: 'auto_awesome', orden: 20 },
  { nombre: 'Descontaminado de Pintura', categoria: 'Servicios Detailing', descripcion: 'Descontaminado químico y físico', precio_auto: 230000, precio_camioneta: 295000, duracion_minutos: 120, agendable: true, icono: 'auto_awesome', orden: 21 },
  { nombre: 'Limpieza de Techo', categoria: 'Servicios Detailing', descripcion: 'Limpieza profunda de techo interior', precio_auto: 110000, precio_camioneta: 130000, duracion_minutos: 60, agendable: true, icono: 'cleaning_services', orden: 22 },
  { nombre: 'Limpieza e Hidratación de Carteras y Tableros', categoria: 'Servicios Detailing', descripcion: 'Cuidado de cuero y tablero', precio_auto: 190000, precio_camioneta: 230000, duracion_minutos: 90, agendable: true, icono: 'cleaning_services', orden: 23 },
  { nombre: 'Limpieza, Descontaminación, Pulido y Sellado por Rin', categoria: 'Servicios Detailing', descripcion: 'Tratamiento completo por rin', precio_auto: 195000, precio_camioneta: 204000, duracion_minutos: 75, agendable: true, icono: 'tire_repair', orden: 24 },
  { nombre: 'Limpieza Pulido y Sellado de Faros', categoria: 'Servicios Detailing', descripcion: 'Restauración de farolas', precio_auto: 140000, precio_camioneta: 130000, duracion_minutos: 60, agendable: true, icono: 'highlight', orden: 25 },
  { nombre: 'Corrección Leve de Rayones por Piezas', categoria: 'Servicios Detailing', descripcion: 'Corrección por pieza', precio_auto: 76000, precio_camioneta: 105000, duracion_minutos: 45, agendable: true, icono: 'auto_awesome', orden: 26 },
  { nombre: 'Descontaminado e Hidratación de Carteras y Tableros', categoria: 'Servicios Detailing', descripcion: 'Descontaminado + hidratación', precio_auto: 190000, precio_camioneta: 230000, duracion_minutos: 90, agendable: true, icono: 'cleaning_services', orden: 27 },
  { nombre: 'Combo Luxury', categoria: 'Servicios Detailing', subcategoria: 'COMBO',
    descripcion: 'Lavado tapicería, carteras, tableros, techo, piso, motor, rines, llantas y super brillo',
    items: ['Tapicería', 'Carteras', 'Tableros', 'Techo', 'Piso', 'Motor', 'Rines', 'Llantas', 'Super brillo'],
    precio_auto: 764000, precio_camioneta: 891000, duracion_minutos: 480, agendable: true, icono: 'auto_awesome', orden: 28 },
  { nombre: 'Limpieza de Tapicería e Interior sin Desmonte', categoria: 'Servicios Detailing', descripcion: 'Interior completo sin desmonte', precio_auto: 450000, precio_camioneta: 510000, duracion_minutos: 180, agendable: true, icono: 'cleaning_services', orden: 29 },
  { nombre: 'Limpieza de Tapicería e Interior con Desmonte', categoria: 'Servicios Detailing', descripcion: 'Interior completo con desmonte', precio_auto: 510000, precio_camioneta: 573000, duracion_minutos: 240, agendable: true, icono: 'cleaning_services', orden: 30 },
  { nombre: 'Tratamiento Nano Cerámico', categoria: 'Servicios Detailing', descripcion: 'Protección nanocerámica premium', precio_auto: 1300000, precio_camioneta: 1400000, duracion_minutos: 360, agendable: true, icono: 'auto_awesome', orden: 31 },

  { nombre: 'Pintura Anticorrosiva', categoria: 'Servicios Anticorrosivos', descripcion: 'Protección y pintura anticorrosiva', precio_auto: 1450000, precio_camioneta: 1550000, duracion_minutos: 480, agendable: true, icono: 'format_paint', orden: 40 },
  { nombre: 'Servicio de Agua Caliente', categoria: 'Servicios Anticorrosivos', descripcion: 'Lavado con agua caliente', precio_auto: 390000, precio_camioneta: 390000, duracion_minutos: 90, agendable: true, icono: 'local_car_wash', orden: 41 },
  { nombre: 'Hidroblasting', categoria: 'Servicios Anticorrosivos', descripcion: 'Hidroblasting de chasis', precio_auto: 1450000, precio_camioneta: 1550000, duracion_minutos: 240, agendable: true, icono: 'local_car_wash', orden: 42 },
];
