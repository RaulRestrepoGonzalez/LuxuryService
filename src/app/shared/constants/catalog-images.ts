const SERVICE_IMAGES: Record<string, string> = {
  oil_barrel: 'https://images.unsplash.com/photo-1625047509248-ec889cbff17f?w=400&q=75',
  local_car_wash: 'https://images.unsplash.com/photo-1601362840469-51e4d8d229c0?w=400&q=75',
  tire_repair: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=400&q=75',
  window: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&q=75',
  build: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=400&q=75',
  highlight: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=400&q=75',
  format_paint: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&q=75',
  auto_awesome: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=400&q=75',
  cleaning_services: 'https://images.unsplash.com/photo-1601362840469-51e4d8d229c0?w=400&q=75',
  shield: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=400&q=75',
  air: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&q=75',
  filter_alt: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=400&q=75',
  water_drop: 'https://images.unsplash.com/photo-1632823471565-1b2239885473?w=400&q=75'
};

const PRODUCT_IMAGES: Record<string, string> = {
  water_drop: 'https://images.unsplash.com/photo-1632823471565-1b2239885473?w=400&q=75',
  filter_alt: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=400&q=75',
  cleaning_services: 'https://images.unsplash.com/photo-1601362840469-51e4d8d229c0?w=400&q=75',
  auto_awesome: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=400&q=75',
  air: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&q=75',
  brightness_7: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&q=75',
  inventory_2: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=400&q=75'
};

const DEFAULT_SERVICE = 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=400&q=75';
const DEFAULT_PRODUCT = 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&q=75';

export const HERO_IMAGE = 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=1200&q=75';

const WIPER_IMAGE = 'https://media.falabella.com/sodimacCO/229986/w=1036,h=832,f=webp,fit=contain,q=85';

export const EXTINTOR_5_LIBRAS_IMAGE = 'https://extintoresenmedellin.com/wp-content/uploads/2025/04/EXTINTOR-MULTIPROPOSITO-ABC.webp';

const WINDSHIELD_CLEANER_IMAGE = 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&q=75';
const SPARK_PLUG_IMAGE = 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=400&q=75';
const OIL_CAN_IMAGE = 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&q=75';
const FILTER_IMAGE = 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=400&q=75';

const TIRE_FALLBACK_IMAGE = 'https://www.todosobreautos.com/content/images/2024/11/Tipos-de-Llantas-para-Autos.webp';

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function resolvedProductImage(p: { nombre: string; categoria?: string; icono?: string; imagen_url?: string | null }): string {
  if (p.imagen_url) return p.imagen_url;

  const text = normalizeText(`${p.categoria || ''} ${p.nombre || ''}`);

  if (/\b(beam blade advance|bean blade|titan|softwiper rexion|plumilla|plumillas|plumillaa|plimilla|softwiper|wiper)\b/.test(text)) {
    return WIPER_IMAGE;
  }
  if (/\b(limpia|limpiador|limpiaparabrisas|lavaparabrisas|parabrisas|lavaparabrisa)\b/.test(text)) {
    return WINDSHIELD_CLEANER_IMAGE;
  }
  if (/\b(bujia|bujías|bujias)\b/.test(text)) {
    return SPARK_PLUG_IMAGE;
  }
  if (/\b(extintor)\b/.test(text)) {
    return EXTINTOR_5_LIBRAS_IMAGE;
  }
  if (/\b(filtro|filtros)\b/.test(text)) {
    return FILTER_IMAGE;
  }
  if (/\b(aceite|oil|lubricante|lubricantes|motor)\b/.test(text)) {
    return OIL_CAN_IMAGE;
  }

  if (/\b(llanta|llantas|neumatico|neumaticos|rines|rin)\b/.test(text)) {
    return TIRE_FALLBACK_IMAGE;
  }

  return productImage(p.icono, p.imagen_url);
}

export function serviceImage(icono?: string, url?: string | null): string {
  return url || SERVICE_IMAGES[icono || ''] || DEFAULT_SERVICE;
}

export function productImage(icono?: string, url?: string | null): string {
  return url || PRODUCT_IMAGES[icono || ''] || DEFAULT_PRODUCT;
}
