const FOOD_SUPPLIERS = new Set([
  'COCA COLA',
  'D1 SAS',
  'COMERCIALIZADORA NACIONAL SAS LTDA',
  'GRUPO ELY SAS',
  'PALETTERIA Y HELDERIA LA ESTACION',
  'POSTOBON S.A',
]);

const FOOD_KEYWORDS = new Set([
  'GALLETA','GALLETAS','DETODITO','NATUCHIP','NATUCHIPS','MARGARITA',
  'CHOCOLATE','BROWNIE','NUTELLA','FERRERO','CHOCONUTELLA','CHOKIS',
  'MAMUT','ONDULADA','TORTA','COCADA','BOCADILLO','TRIS','CHEETOS',
  'DORITOS','FRITOLAY','CHEESE','PAPA','PLATANO','ROSQUITA','ROSQUITAS',
  'ACHIRAS','PANDERITOS','YABOLINES','BOLIQUESO','SUSPIROS',
  'LONCHERA','MESCLAS','SURTIDA','SURTIDO','QUAKER','CROK','UVAS',
  'MANANTIAL','CREMA','AREQUIPE','LECHE','ABUELITA','COCOSET',
  'PORCIN','PUDIN','PALETA','PALETAS','PALETTA','PALETT',
  'COROZO','FRESA','GOMITA','TROZOS','CHOCLITOS','CHOCLO','ORE',
  'OREOS','CHIPS','MANI','MANIMOTO','MANI MOTO',
  'JUGO','MOTO CRUNCH','RED VELVET','CHOCOFUNG',
  'LATTE','CAPUCCINO','CAPUCHINO',
  'CAFE','CAFÉ','TINTO',
]);

const DRINK_KEYWORDS = new Set([
  'GASEOSA','GASEOSAS','COCA','COCACOLA','COLA','QUATRO','CHOICE',
  'BRISA','BRETAÑA','LIMON','LIMA','MENTA','FRESCH','KOLA','ROMAN',
  'GINGER','CANADA','DRIL','PONY','MALTA','GATORADE','MONSTER',
  'ENERGY','RED BULL','HATSU','CITRUS','FUZE','AGUA','ACQUA','QATRO',
  'BLUE','ICE','MANZANA','DURAZNO','MARACUYA','MANGO','FRUTOS',
  'ROJOS','VERDES','FRUTA','TROPICAL','MORA','KIWI','VAINILLA',
  'SCHWEPPES','H2OH','MR','NECTAR','VITAL','HIDRATACION','BEBIDA',
  'YOP','VALLE','TEA','AGUILA','CERVEZA','CORONITA','POLA','CLUB',
  'COLOMBIA','CORONA','HEINEKEN','MILLER','LITE','NAL','ROSE',
  'SIX','PASTEL','FRAMB','HIRBABUENAS','SANDI','ALBAHA','CERO',
  'LATA','HIDRA',
]);

const AUTO_SAFE_WORDS = new Set([
  'LLANTA','LLANTAS','PLUMILLA','PLUMILLAS','PARABRISA','PARABRISAS',
  'EXTINTOR','SIMONIZ','LUBRISTONE','WD40','ACEITE','FILTRO',
  'REFRIGERANTE','TERMINAL','TERMINALES','BOTAS','TAPETE','TAPETES',
]);

const tokenize = (s: string): string[] =>
  s.toUpperCase().split(/[\s,._\-+\\/]+/).filter(Boolean);

export function isFoodProduct(name: string, supplier?: string): boolean {
  const upperName = name.toUpperCase();
  const words = tokenize(name);

  // Never flag known auto parts
  for (const w of words) {
    if (AUTO_SAFE_WORDS.has(w)) return false;
  }
  if (upperName.includes('GUARDABARRO')) return false;
  if (upperName.includes('PINTURA')) return false;

  // Check supplier
  if (supplier && FOOD_SUPPLIERS.has(supplier.toUpperCase())) return true;

  // Check individual keywords
  for (const w of words) {
    if (FOOD_KEYWORDS.has(w) || DRINK_KEYWORDS.has(w)) return true;
  }

  return false;
}
