import { connectDb, getDb } from './db.js';

// ── Image URLs ──
const IMG = {
  AUTO:        'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400&q=75',
  AUTO_BODY:   'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&q=75',
  PARTS:       'https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?w=400&q=75',
  OIL:         'https://images.unsplash.com/photo-1625047509248-ec889cbff17f?w=400&q=75',
  FILTER:      'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=400&q=75',
  BRAKE:       'https://images.unsplash.com/photo-1632823471565-1b2239885473?w=400&q=75',
  TIRE:        'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=400&q=75',
  WIPER:       'https://http2.mlstatic.com/D_NQ_NP_932956-MCO110432007671_042026-O.webp',
  ELECTRONICS: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&q=75',
  BATTERY:     'https://images.unsplash.com/photo-1620714223084-8fcacc6dfd8d?w=400&q=75',
  CLEANING:    'https://images.unsplash.com/photo-1601362840469-51e4d8d229c0?w=400&q=75',
  MAT:         'https://images.unsplash.com/photo-1599232288126-7a8cb48a11b3?w=400&q=75',
  ACCESSORY:   'https://images.unsplash.com/photo-1569154941061-e231b4725ef1?w=400&q=75',
  FOOD:        'https://images.unsplash.com/photo-1562967914-608f82629710?w=400&q=75',
  CANDY:       'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&q=75',
  COFFEE:      'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&q=75',
  SODA:        'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=75',
  JUICE:       'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=75',
  WATER:       'https://images.unsplash.com/photo-1578574577315-3fbde4e3abe2?w=400&q=75',
  BEER:        'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=400&q=75',
  AC:          'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&q=75',
  CIGARETTE:   'https://images.unsplash.com/photo-1572044161944-2d8e5455624d?w=400&q=75',
  LIGHT:       'https://images.unsplash.com/photo-1617859047452-8510bcf207fd?w=400&q=75',
};

// ── Direct keyword → image map (word-level exact match) ──
const IMAGE_MAP: Record<string, string> = {
  // Marca de autopartes / códigos
  ACP: IMG.PARTS, AIP: IMG.PARTS, OLP: IMG.FILTER, OIP: IMG.FILTER,
  FLP: IMG.PARTS,
  BOSCH: IMG.PARTS, MERCEDEZ: IMG.PARTS, ONIX: IMG.PARTS,
  HILLUX: IMG.PARTS, TOYOTA: IMG.PARTS, NISSAN: IMG.PARTS, MAZDA: IMG.PARTS,
  BRAXOS: IMG.PARTS, RACORES: IMG.PARTS,
  REPUESTO: IMG.PARTS, REPUESTOS: IMG.PARTS,
  SOPORTE: IMG.PARTS, SOPORTES: IMG.PARTS, TUERCAS: IMG.PARTS,
  TERMINALES: IMG.PARTS, REFLECTIVO: IMG.PARTS, CINTA: IMG.ELECTRONICS,
  BUJIAS: IMG.PARTS, BUJIA: IMG.PARTS, MOTOR: IMG.PARTS,
  VALVULA: IMG.PARTS, VÁLVULA: IMG.PARTS, VALVULAS: IMG.PARTS,
  ABRAZADERAS: IMG.PARTS, MANGUERA: IMG.PARTS, CORREA: IMG.PARTS,
  BANDA: IMG.PARTS, SELLADOR: IMG.PARTS, PINTURA: IMG.PARTS,
  THINNER: IMG.PARTS, SILICONA: IMG.PARTS, ADITIVO: IMG.PARTS,
  EMPAQUE: IMG.PARTS, TAPETE: IMG.MAT, TAPETES: IMG.MAT,
  TERMOSTATO: IMG.PARTS, CHAZOS: IMG.PARTS, TUBO: IMG.PARTS,
  UNION: IMG.PARTS, PITO: IMG.PARTS, RINES: IMG.TIRE,
  GUARDABARROS: IMG.AUTO_BODY, LATONERIA: IMG.AUTO_BODY,
  RETOQUE: IMG.AUTO_BODY, REPARACION: IMG.AUTO_BODY,
  ESTRIBO: IMG.AUTO_BODY, PUERTA: IMG.AUTO_BODY,
  CONTRACAJETAS: IMG.AUTO_BODY, CAJETAS: IMG.AUTO_BODY,
  DEFENSA: IMG.AUTO_BODY,

  // Aceite / lubricantes
  ACEITE: IMG.OIL, LUBRICANTE: IMG.OIL, LUBRICACION: IMG.OIL,
  MOBIL: IMG.OIL, HELIX: IMG.OIL, SHELL: IMG.OIL,
  HAVOLINE: IMG.OIL, CHEVRON: IMG.OIL,
  '5W30': IMG.OIL, '15W40': IMG.OIL, '20W50': IMG.OIL, '10W40': IMG.OIL,
  CK4: IMG.OIL,

  // Filtros
  FILTRO: IMG.FILTER, BALDWIN: IMG.FILTER,

  // Frenos
  FRENOS: IMG.BRAKE, FRENO: IMG.BRAKE,
  CALIPER: IMG.BRAKE, PASTILLAS: IMG.BRAKE, PASTLLAS: IMG.BRAKE,
  DISCOS: IMG.BRAKE, DISCO: IMG.BRAKE, CILINDROS: IMG.BRAKE,
  ANTIRUIDO: IMG.BRAKE,

  // Llantas / rines / suspension
  LLANTA: IMG.TIRE, LLANTAS: IMG.TIRE, NEUMATICO: IMG.TIRE,
  BRIDGESTONE: IMG.TIRE, KUMHO: IMG.TIRE, ALVENTI: IMG.TIRE,
  AMORTIGUADOR: IMG.TIRE, AMORTIGUADORES: IMG.TIRE,
  SUSPENSION: IMG.TIRE, DIRECCION: IMG.TIRE,
  CAJA: IMG.TIRE,

  // Plumas
  PLUMILLA: IMG.WIPER, PLUMILLAS: IMG.WIPER, PLUMILLAA: IMG.WIPER,
  PLIMILLA: IMG.WIPER, PLIMILLAS: IMG.WIPER,
  BEAM: IMG.WIPER, BLADE: IMG.WIPER, TITAN: IMG.WIPER,
  WIPER: IMG.WIPER,

  // Luces / faros
  FAROS: IMG.LIGHT, LAMPARA: IMG.LIGHT, POLARIZADO: IMG.LIGHT,

  // Aire acondicionado
  EVAPORADOR: IMG.AC, CONDENSADOR: IMG.AC, RADIADOR: IMG.AC,
  REFRIGERANTE: IMG.AC, CARGA: IMG.AC, GAS: IMG.AC,

  // Electronica
  SENSOR: IMG.ELECTRONICS, CABLE: IMG.ELECTRONICS, CABLES: IMG.ELECTRONICS,
  SWITCH: IMG.ELECTRONICS, MODULO: IMG.ELECTRONICS, RELAY: IMG.ELECTRONICS,
  FUSIBLE: IMG.ELECTRONICS, EXTINTOR: IMG.ELECTRONICS,
  BELKIN: IMG.ELECTRONICS, CARGADOR: IMG.ELECTRONICS,
  LIGHTHING: IMG.ELECTRONICS, USB: IMG.ELECTRONICS,
  CABEZOTE: IMG.ELECTRONICS, SCANER: IMG.ELECTRONICS,

  // Baterias
  BATERIA: IMG.BATTERY, BATERÍAS: IMG.BATTERY,
  TUNDER: IMG.BATTERY, TUDOR: IMG.BATTERY,
  BAT: IMG.BATTERY,

  // Limpieza / Detailing
  SHAMPOO: IMG.CLEANING, SIMONIZ: IMG.CLEANING, CERA: IMG.CLEANING,
  AMBIENTADOR: IMG.CLEANING, DESENGRASANTE: IMG.CLEANING,
  LUBRISTONE: IMG.CLEANING, FEBREZE: IMG.CLEANING, LYSOL: IMG.CLEANING,
  LAVAPARABRISAS: IMG.CLEANING, LAVAPARABRISA: IMG.CLEANING,
  GRAFITO: IMG.CLEANING, PANOLA: IMG.CLEANING, MICROFIBRA: IMG.CLEANING,
  MICROFRIBA: IMG.CLEANING, PANOLAS: IMG.CLEANING,
  FRESCO: IMG.CLEANING, FRESH: IMG.CLEANING, AUTOFRESCO: IMG.CLEANING,
  PERFUME: IMG.CLEANING, FRESHENER: IMG.CLEANING, FRESHER: IMG.CLEANING,
  ELIMINADOR: IMG.CLEANING, ELIMINATOR: IMG.CLEANING,
  SPRAY: IMG.CLEANING, W40: IMG.CLEANING,
  ULTIMATE: IMG.CLEANING, CLEANER: IMG.CLEANING,
  WHEEL: IMG.CLEANING, PROTECTAN: IMG.CLEANING,
  WD40: IMG.CLEANING, AEROSOL: IMG.CLEANING,
  BLACK: IMG.CLEANING,

  // Comida / snacks
  GALLETA: IMG.FOOD, GALLETAS: IMG.FOOD, CHIPS: IMG.FOOD, PAPA: IMG.FOOD,
  DETODITO: IMG.FOOD, NATUCHIP: IMG.FOOD, NATUCHIPS: IMG.FOOD,
  ROSQUITA: IMG.FOOD, ROSQUITAS: IMG.FOOD,
  ACHIRAS: IMG.FOOD, CHOCLO: IMG.FOOD, CHOCLITOS: IMG.FOOD,
  OREO: IMG.FOOD, CHEETOS: IMG.FOOD, DORITOS: IMG.FOOD,
  FRITOLAY: IMG.FOOD, CHOKIS: IMG.FOOD, MANI: IMG.FOOD,
  MANIMOTO: IMG.FOOD, PANDERITOS: IMG.FOOD, SUSPIROS: IMG.FOOD,
  YABOLINES: IMG.FOOD, BOLIQUESO: IMG.FOOD, MAMUT: IMG.FOOD,
  ONDULADA: IMG.FOOD, TORTA: IMG.FOOD, COCADA: IMG.FOOD,
  LONCHERA: IMG.FOOD, MESCLAS: IMG.FOOD, SURTIDO: IMG.FOOD,
  SURTIDA: IMG.FOOD, QUAKER: IMG.FOOD, CROK: IMG.FOOD,
  UVAS: IMG.FOOD, MANANTIAL: IMG.FOOD,
  BOCADILLO: IMG.FOOD, QUESO: IMG.FOOD,
  TRIS: IMG.FOOD, CHEESE: IMG.FOOD,
  PLATANO: IMG.FOOD, VERDE: IMG.FOOD,
  AREQUIPE: IMG.FOOD, LECHE: IMG.FOOD,
  GATORLIT: IMG.FOOD, HIDRA: IMG.FOOD,
  MARGARITA: IMG.FOOD, PAPAS: IMG.FOOD,
  PORCIN: IMG.FOOD, PUDIN: IMG.FOOD,
  TRIDENT: IMG.FOOD,

  // Paletas / dulces / golosinas
  PALETA: IMG.CANDY, PALETAS: IMG.CANDY, PALETTA: IMG.CANDY,
  PALETT: IMG.CANDY, GALLANT: IMG.CANDY,
  VELVET: IMG.CANDY, ECOVISION: IMG.CANDY, REXION: IMG.CANDY,
  SOFTWIPER: IMG.CANDY,

  // Cafe
  CAFE: IMG.COFFEE, CAFÉ: IMG.COFFEE, TINTO: IMG.COFFEE,
  CAPUCCINO: IMG.COFFEE, CAPUCHINO: IMG.COFFEE, COCOSET: IMG.COFFEE,
  COCOSETTE: IMG.COFFEE, TRADICIONAL: IMG.COFFEE,
  ABUELITA: IMG.COFFEE, CHOCOLATE: IMG.COFFEE,
  NESCAFE: IMG.COFFEE, LATTES: IMG.COFFEE, LATTE: IMG.COFFEE,

  // Bebidas / gaseosas
  COCA: IMG.SODA, COCACOLA: IMG.SODA, COLA: IMG.SODA,
  GASEOSA: IMG.SODA, SODA: IMG.SODA, FRESCH: IMG.SODA,
  KOLA: IMG.SODA, ROMAN: IMG.SODA, CANADA: IMG.SODA,
  DRIL: IMG.SODA, GINGER: IMG.SODA, QUATRO: IMG.SODA,
  CHOICE: IMG.SODA, PONY: IMG.SODA, MALTA: IMG.SODA,
  SPRITE: IMG.SODA,

  // Bebidas / jugos
  FUZE: IMG.JUICE, TEA: IMG.JUICE, JUGO: IMG.JUICE,

  // Bebidas / agua
  AGUA: IMG.WATER, ACQUA: IMG.WATER, BRISA: IMG.WATER,
  BRETAÑA: IMG.WATER,

  // Bebidas / energetic
  MONSTER: IMG.SODA, ENERGY: IMG.SODA,
  GATORADE: IMG.JUICE, GATORLITE: IMG.JUICE,
  RED: IMG.SODA, BULL: IMG.SODA,
  HATSU: IMG.JUICE, CITRUS: IMG.JUICE,
  MANZANA: IMG.JUICE, DURAZNO: IMG.JUICE, MARACUYA: IMG.JUICE,
  MANGO: IMG.JUICE, FRUTOS: IMG.JUICE, ROJOS: IMG.JUICE,
  VERDES: IMG.JUICE, LIMON: IMG.JUICE, FRUTA: IMG.JUICE,
  TROPICAL: IMG.JUICE, MORA: IMG.JUICE, KIWI: IMG.JUICE,

  // Cerveza
  CERVEZA: IMG.BEER, AGUILA: IMG.BEER, CORONITA: IMG.BEER,
  POLA: IMG.BEER, CLUB: IMG.BEER, COLOMBIA: IMG.BEER,
  CORONA: IMG.BEER, HEINEKEN: IMG.BEER, MILLER: IMG.BEER,
  LITE: IMG.BEER, NAL: IMG.BEER, ROSE: IMG.BEER,

  // Cigarrillos
  MARLBORO: IMG.CIGARETTE, CIGARRILLO: IMG.CIGARETTE,

  // Varios
  BLUE: IMG.JUICE, ICE: IMG.JUICE,
};

const SERVICE_IMG_MAP: Record<string, string> = {
  LAVADO: IMG.CLEANING, LAVADA: IMG.CLEANING,
  DETALLADO: IMG.CLEANING, DETALLADA: IMG.CLEANING,
  POLARIZADO: IMG.LIGHT,
  ALINEACION: IMG.TIRE, BALANCEO: IMG.TIRE,
  FRENOS: IMG.BRAKE, FRENO: IMG.BRAKE,
  ACEITE: IMG.OIL,
  SINCRONIZACION: IMG.AUTO_BODY,
  SCANNER: IMG.ELECTRONICS, SCANER: IMG.ELECTRONICS,
  DIAGNOSTICO: IMG.ELECTRONICS, DIAGNÓSTICO: IMG.ELECTRONICS,
  SUSPENSION: IMG.TIRE,
  DIRECCION: IMG.TIRE,
  RINES: IMG.TIRE,
  AIRE: IMG.AC,
  ENGRASE: IMG.OIL,
  BATERIA: IMG.BATTERY,
  INSTALACION: IMG.AUTO_BODY,
  LATONERIA: IMG.AUTO_BODY,
  GUARDABARROS: IMG.AUTO_BODY,
  PUERTA: IMG.AUTO_BODY,
  UNIDO: IMG.AUTO_BODY, SOLDADURA: IMG.AUTO_BODY,
  CAMBIAR: IMG.AUTO_BODY, CAMBIO: IMG.AUTO_BODY,
  REPARACION: IMG.AUTO_BODY, REPARAR: IMG.AUTO_BODY,
  DESMONTE: IMG.AUTO_BODY, MONTAJE: IMG.AUTO_BODY,
  LIQUIDO: IMG.BRAKE,
  PASTILLAS: IMG.BRAKE,
  PLUMILLAS: IMG.WIPER, PLUMILLA: IMG.WIPER,
  CORREA: IMG.AUTO_BODY, BANDA: IMG.AUTO_BODY,
};

// ── Auto part code pattern ──
const PART_CODE_RE = /^[A-Z]{2,6}[\s-]*\d/;

function normalizeName(name: string): string {
  // Normalize unicode (handles composed/decomposed chars)
  return name.normalize('NFC').toUpperCase();
}

function tokenize(name: string): string[] {
  return normalizeName(name).split(/[\s,/()\\\-+]+/).filter(w => w.length > 1);
}

function findImage(name: string, map: Record<string, string>, defaultImg: string): string {
  const upper = name.toUpperCase().trim();
  if (map[upper]) return map[upper];

  const words = tokenize(name);
  for (const w of words) {
    if (map[w]) return map[w];
  }

  // 2-word combos
  for (let i = 0; i < words.length - 1; i++) {
    const combo = words[i] + ' ' + words[i + 1];
    if (map[combo]) return map[combo];
    const joined = words[i] + words[i + 1];
    if (map[joined]) return map[joined];
  }

  for (let i = 0; i < words.length - 2; i++) {
    const triple = words[i] + words[i + 1] + words[i + 2];
    if (map[triple]) return map[triple];
  }

  return defaultImg;
}

function isFoodWord(w: string): boolean {
  return ['CHOCLITOS','CHOCLO','GALLETA','GALLETAS','ORE','OREOS','CHIPS','PAPA',
    'DETODITO','NATUCHIP','NATUCHIPS','ROSQUITA','ROSQUITAS','ACHIRAS',
    'CHEETOS','DORITOS','FRITOLAY','CHOKIS','MANI','MANIMOTO',
    'PANDERITOS','SUSPIROS','YABOLINES','BOLIQUESO','MAMUT','ONDULADA',
    'TORTA','COCADA','LONCHERA','MESCLAS','SURTIDA','SURTIDO',
    'QUAKER','CROK','UVAS','MANANTIAL','BOCADILLO','TRIS','CHEESE',
    'PLATANO','AREQUIPE','LECHE','ABUELITA','CHOCOLATE','COCOSET'].includes(w);
}

function isDrinkWord(w: string): boolean {
  return ['COCA','COCACOLA','COLA','GASEOSA','SODA','FRESCH','KOLA',
    'ROMAN','GINGER','CANADA','DRIL','QUATRO','CHOICE','PONY','MALTA',
    'PONY','MALTA','GATORADE','MONSTER','ENERGY','RED','BULL',
    'HATSU','CITRUS','FUZE','TEA','AGUA','ACQUA','BRISA','BRETAÑA',
    'GATORLIT','HIDRA','BLUE','ICE',
    'MANZANA','DURAZNO','MARACUYA','MANGO','FRUTOS','ROJOS','VERDES',
    'LIMON','FRUTA','TROPICAL','MORA','KIWI','VAINILLA'].includes(w);
}

function isCleaningWord(w: string): boolean {
  return ['SHAMPOO','SIMONIZ','CERA','AMBIENTADOR','DESENGRASANTE',
    'LUBRISTONE','FEBREZE','LYSOL','LAVAPARABRISAS','LAVAPARABRISA',
    'GRAFITO','PANOLA','PANOLAS','MICROFIBRA','MICROFRIBA','AUTOFRESCO',
    'FRESCO','FRESH','FRESHENER','FRESHER','PERFUME','ELIMINADOR',
    'ELIMINATOR','SPRAY','W40','LIMPIA','LIMPIADOR','LIMPIAPARABRISAS',
    'GOLD','RICH','LEATHER','CLASS','ODOR','AIRE','RE','CAR',
    'LITTLE','JOE','DOG','CHERRY','OCEAN','SPLASH','SWEET'].includes(w);
}

function categorizeProduct(name: string): string {
  const words = tokenize(name);
  const upper = name.toUpperCase().trim();

  // Auto part code?
  if (PART_CODE_RE.test(upper)) return IMG.PARTS;

  let drinkScore = 0, foodScore = 0, cleaningScore = 0;

  for (const w of words) {
    if (isFoodWord(w)) foodScore += 2;
    else if (isDrinkWord(w)) drinkScore += 2;
    else if (isCleaningWord(w)) cleaningScore += 2;
    else if (w === 'GATORLIT' || w === 'HIDRA') foodScore += 2;
  }

  // Check for cleaning context
  if (name.toUpperCase().includes('LIMPIA') || name.toUpperCase().includes('LIMPIADOR')) {
    // throttle body cleaner is auto part
    if (name.toUpperCase().includes('ACELERACION') || name.toUpperCase().includes('ACELERADOR') ||
        name.toUpperCase().includes('ELECTRINICO') || name.toUpperCase().includes('INYECTORES')) {
      // These are auto chemicals
    } else {
      cleaningScore += 2;
    }
  }

  // Car air fresheners
  if (name.toUpperCase().includes('AIR') ||
      name.toUpperCase().includes('CAR BLOCK') ||
      name.toUpperCase().includes('CAR AIR')) {
    cleaningScore += 2;
  }

  if (cleaningScore > drinkScore && cleaningScore > foodScore && cleaningScore > 0) return IMG.CLEANING;
  if (drinkScore > foodScore && drinkScore > 0) return IMG.JUICE;
  if (foodScore > 0) return IMG.FOOD;

  return IMG.PARTS;
}

function productImage(name: string): string {
  const direct = findImage(name, IMAGE_MAP, IMG.PARTS);
  if (direct !== IMG.PARTS) return direct;

  // Handle corrupted encoding (e.g. BRETAÑA stored as BRETAÃ‘A)
  const upper = name.toUpperCase();
  if (upper.includes('BRETA')) return IMG.WATER;

  return categorizeProduct(name);
}

async function main() {
  await connectDb();
  const db = getDb();

  const products = await db.collection('productos').find({}).toArray();
  let prodUpdated = 0;
  for (const p of products) {
    const img = productImage(p.nombre);
    if (p.imagen_url !== img) {
      await db.collection('productos').updateOne({ _id: p._id }, { $set: { imagen_url: img } });
      prodUpdated++;
    }
  }
  console.log(`Productos: ${prodUpdated} actualizados`);

  const services = await db.collection('servicios').find({}).toArray();
  let svcUpdated = 0;
  for (const s of services) {
    const img = findImage(s.nombre, SERVICE_IMG_MAP, IMG.CLEANING);
    if (s.imagen_url !== img) {
      await db.collection('servicios').updateOne({ _id: s._id }, { $set: { imagen_url: img } });
      svcUpdated++;
    }
  }
  console.log(`Servicios: ${svcUpdated} actualizados`);

  const grouped = await db.collection('productos').aggregate([
    { $group: { _id: '$imagen_url', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();
  console.log('\nDistribución:');
  for (const g of grouped) {
    const key = g._id?.split('?')[0]?.split('photo-')[1]?.slice(0, 12) || 'default';
    console.log(`  [${g.count}] ...${key}`);
  }

  console.log('\nMigración completada');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });