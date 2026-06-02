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

// Product-specific image constants (shared between shop and booking)
const MOBIL_10W40_IMAGE = 'https://aldauto.co/wp-content/uploads/2024/07/MO-10W40-SP-CT-1.jpg';
const MOBIL_10W40_GALON_IMAGE = 'https://aldauto.co/wp-content/uploads/2024/07/MO-10W40-SP-GL-1.jpg';
const MOBIL_20W50_IMAGE = 'https://energiteca.vtexassets.com/arquivos/ids/160372/Aceite-Mobil-SUP-1000-20W-50-1-4.png?v=638852833774370000';
const MOBIL_20W50_GALON_IMAGE = 'https://daycar.com.co/wp-content/uploads/2024/01/MOBIL-1000-20W50-SP-GALON-4-LITROS.jpeg';
const MOBIL_ATF_DM_IMAGE = 'https://cdnx.jumpseller.com/comercialharambour/image/65391659/resize/1200/630?1752587427';
const MOBIL_DELVAC_MODERM_15W40_CUARTO_IMAGE = 'https://llantaspuntodeservicios.com/wp-content/uploads/2026/02/15W40-ACEITE-MOBIL-DELVAC-MODERN-DIESEL-SINTET-1_4-4601563.webp';
const MOBIL_DELVAC_MODERM_15W40_GL_IMAGE = 'https://terdex.com.co/wp-content/uploads/2024/06/Mobil-Delvac-Modern™-15W-40-Full-Protection.jpg';
const MOBIL_DELVAC_MX_ESP_15W40_IMAGE = 'https://filtrosayz.shop/cdn/shop/files/MOBIL_DELVAC_15W40_CK4_CUARTO.png?v=1754066167';
const MOBIL_DELVAC_MX_ESP_15W40_GL_IMAGE = 'https://autopla1.b-cdn.net/wp-content/uploads/2025/12/15W40-Mobil-1.jpg';
const MOBIL_SUPER_2000_10W30_IMAGE = 'https://energiteca.vtexassets.com/arquivos/ids/156496/Aceite-Mobil-SUP-2000-10W30-1-4.png?v=638852833793600000';
const MOBIL_SUPER_2000_10W30_GL_IMAGE = 'https://energiteca.vtexassets.com/arquivos/ids/156497-800-800?v=638852833800300000&width=800&height=800&aspect=true';
const MOBIL_SUPER_3000_5W30_IMAGE = 'https://terdex.com.co/wp-content/uploads/2024/06/Mobil-Super™-3000-5W-30.jpg';
const MOBIL_SUPER_3000_5W30_GL_IMAGE = 'https://terdex.com.co/wp-content/uploads/2024/06/Mobil-Super™-3000-5W-30.jpg';
const MOBIL_SUPER_3000_5W40_IMAGE = 'https://terdex.com.co/wp-content/uploads/2024/06/Mobil-Super™-3000-5W-40.jpg';
const MOBIL_SUPER_3000_5W40_GL_IMAGE = 'https://terdex.com.co/wp-content/uploads/2024/06/Mobil-Super™-3000-5W-40.jpg';
const MOBIL_1_0W20_IMAGE = 'https://http2.mlstatic.com/D_Q_NP_694908-MLA99357258250_112025-O.webp';
const MOBIL_1_0W20_GL_IMAGE = 'https://media.falabella.com/sodimacCO/792400/w=1036,h=832,f=webp,fit=contain,q=85';
const MOBIL_1_ADVANCE_5W30_IMAGE = 'https://ciadelubricantes.com/wp-content/uploads/2021/08/600325-800x800.jpg';
const MOBIL_5W30_ESP_IMAGE = 'https://www.lubricantesescamilla.com/wp-content/uploads/2024/05/1MO5W30Q.jpg';
const MOBIL_HIDRAULICO_10W_IMAGE = 'https://lubriaceites.com/wp-content/uploads/2023/12/1009.jpg';
const MOBIL_SUPER_1000_20W50_IMAGE = 'https://tecnifil.com/wp-content/uploads/2023/05/COMPRAR-ACEITE-MOBIL-SUPER-1000-MIL-20w-50-Colombia-.jpg';
const MOBIL_SUPER_1000_20W50_GL_IMAGE = 'https://tecnifil.com/wp-content/uploads/2024/04/COMPRAR-ACEITE-MOBIL-SUPER-1000-MIL-20w-50-Galon-Colombia-Tecnifil.jpg';
const MOBIL_SUPER_2000_5W20_IMAGE = 'https://autopla1.b-cdn.net/wp-content/uploads/2026/01/601250AM_1.webp';
const WIPER_IMAGE = 'https://media.falabella.com/sodimacCO/229986/w=1036,h=832,f=webp,fit=contain,q=85';
const SHELL_10W30_IMAGE = 'https://tecnifil.com/wp-content/uploads/2023/06/Comprar-SHELL-10W30-CUARTO-Colombia-distribuidor-Tecnifil-.jpg';
const SHELL_HELIX_ULTRA_0W20_IMAGE = 'https://tecnifil.com/wp-content/uploads/2024/01/Comprar-SHELL-HELIX-ULTRA-0W20-CUARTO-Colombia-distribuidor-Tecnifil.jpg';
const SHELL_HELIX_ULTRA_0W20_GL_IMAGE = 'https://tecnifil.com/wp-content/uploads/2024/03/Comprar-SHELL-HELIX-ULTRA-SN-0W-20-Galon-Tecnifil-Colombia-Distribuidor-Colombia.jpg';
const SHELL_HELIX_ULTRA_5W30_IMAGE = 'https://aldauto.co/wp-content/uploads/2022/10/HUL-5W30-SN-CT-1.jpg';
const SHELL_HELIX_ULTRA_5W30_GL_IMAGE = 'https://aldauto.co/wp-content/uploads/2022/10/HUL-5W30-SN-GL-1.jpg';
const SHELL_HELIX_ULTRA_5W40_IMAGE = 'https://www.lubricantesescamilla.com/wp-content/uploads/2024/05/1SH5W40Q.jpg';
const SHELL_HELIX_ULTRA_5W40_GL_IMAGE = 'https://tecnifil.com/wp-content/uploads/2023/07/ACEITE-SHELL-HELIX-ULTRA-GALON-TECNIFIL-TIRA.jpg';
const SHELL_HELIX_ULTRA_20W50_GL_IMAGE = 'https://aldauto.co/wp-content/uploads/2022/10/HX5-20W50-SN-GL-1.jpg';
const TERPEL_OILTEC_10W40_GL_IMAGE = 'https://giocarautocenter.com/wp-content/uploads/2025/06/Aceite-de-Motol-Oiltec.jpg';
const TERPEL_OILTEC_20W50_IMAGE = 'https://www.lubricantesescamilla.com/wp-content/uploads/2024/05/1TP20W50Q.jpg';
const TERPEL_OILTEC_20W50_GL_IMAGE = 'https://www.lubricantesescamilla.com/wp-content/uploads/2024/05/1TP20W50G.jpg';
const ACP_007_IMAGE = 'https://premiumfilters.store/cdn/shop/files/ACP-007.jpg?v=1736967224';
const ACP_013_IMAGE = 'https://premiumfilters.store/cdn/shop/files/ACP-013.jpg?v=1736967216';
const ACP_014_IMAGE = 'https://premiumfilters.store/cdn/shop/files/ACP-014.jpg?v=1736967215';
const ACP_096_IMAGE = 'https://premiumfilters.store/cdn/shop/files/ACP-096.jpg?v=1736967152';
const ACP_109_IMAGE = 'https://premiumfilters.store/cdn/shop/files/ACP-109.jpg?v=1712096616';
const ACP_132_IMAGE = 'https://premiumfilters.store/cdn/shop/files/ACP-132_dd10b8cf-7acb-4cd1-999d-ce8b601779c9.jpg?v=1747231818';
const ACP_138_IMAGE = 'https://premiumfilters.store/cdn/shop/files/ACP-138.jpg?v=1736967116';
const ACP_IMAGE = ACP_013_IMAGE;
const AIP_667_IMAGE = 'https://premiumfilters.store/cdn/shop/files/AIP-667.jpg';
const AIP_744_IMAGE = 'https://premiumfilters.store/cdn/shop/files/AIP-744.jpg';
const AIP_781_IMAGE = 'https://premiumfilters.store/cdn/shop/files/AIP-781.jpg';
const AIP_844_IMAGE = 'https://premiumfilters.store/cdn/shop/files/AIP-844.jpg';
const AIP_860_IMAGE = 'https://premiumfilters.store/cdn/shop/files/AIP-860.jpg';
const AIP_864_IMAGE = 'https://premiumfilters.store/cdn/shop/files/AIP-864.jpg';
const AIP_889_IMAGE = 'https://premiumfilters.store/cdn/shop/files/AIP-889.jpg';
const AIP_899_IMAGE = 'https://premiumfilters.store/cdn/shop/files/AIP-899.jpg';
const AIP_968_IMAGE = 'https://premiumfilters.store/cdn/shop/files/AIP-968.jpg';
const AIP_977_IMAGE = 'https://premiumfilters.store/cdn/shop/files/AIP-977.jpg';
const AIP_1050_IMAGE = 'https://premiumfilters.store/cdn/shop/files/AIP-1050.jpg';
const AIP_1084_IMAGE = 'https://premiumfilters.store/cdn/shop/files/AIP-1084.jpg';
const AIP_1118_IMAGE = 'https://premiumfilters.store/cdn/shop/files/AIP-1118.jpg';
const AIP_1123_IMAGE = 'https://premiumfilters.store/cdn/shop/files/AIP-1123.jpg';
const AIP_1135_IMAGE = 'https://premiumfilters.store/cdn/shop/files/AIP-1135.jpg';
const AIP_1138_IMAGE = 'https://premiumfilters.store/cdn/shop/files/AIP-1138.jpg';
const AIP_1141_IMAGE = 'https://premiumfilters.store/cdn/shop/files/AIP-1141.jpg';
const AIP_1146_IMAGE = 'https://premiumfilters.store/cdn/shop/files/AIP-1146.jpg';
const CHEVRON_HAVOLINE_CK4_15W40_IMAGE = 'https://tecnifil.com/wp-content/uploads/2024/10/Compra-Aceite-Lubricante-CHEVRON-DELO-400-15W-40-presentacion-CUARTO-Tecnifil-Colombia.jpg';
const CHEVRON_HAVOLINE_CK4_15W40_GL_IMAGE = 'https://tecnifil.com/wp-content/uploads/2024/10/Compra-Aceite-Lubricante-CHEVRON-DELO-400-15W-40-presentacion-GALON-Tecnifil-Colombia.jpg';
const CHEVRON_20W50_IMAGE = 'https://shfilters.com/wp-content/uploads/2020/10/hav-motor-oil-sae-20w50-api-sn-lubricante-medellin.png';
const CHEVRON_20W50_GL_IMAGE = 'https://shfilters.com/wp-content/uploads/2020/10/HAV-MOTOR-OIL-SAE-20W50-API-SN-GALON.jpg';
const HAVOLINE_5W30_IMAGE = 'https://www.costaoil.com.co/wp-content/uploads/2025/01/223510QAC-20251216.webp';
export const EXTINTOR_5_LIBRAS_IMAGE = 'https://extintoresenmedellin.com/wp-content/uploads/2025/04/EXTINTOR-MULTIPROPOSITO-ABC.webp';
const WINDSHIELD_CLEANER_IMAGE = 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&q=75';
const SPARK_PLUG_IMAGE = 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=400&q=75';
const OIL_CAN_IMAGE = 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&q=75';
const FILTER_IMAGE = 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=400&q=75';
const OIP_005_IMAGE = 'https://cdn.shopify.com/s/files/1/0573/3269/5106/files/OLP-005.jpg?v=1736966258';
const OIP_006_IMAGE = 'https://cdn.shopify.com/s/files/1/0573/3269/5106/files/OLP-006_6c1c2d8e-52d7-4b4b-9ca0-c2b8e9ff3908.jpg?v=1749243340';
const OIP_008_IMAGE = 'https://cdn.shopify.com/s/files/1/0573/3269/5106/files/OLP-008.jpg?v=1736966255';
const OIP_010_IMAGE = 'https://cdn.shopify.com/s/files/1/0573/3269/5106/files/OLP-010.jpg?v=1736966254';
const OIP_012_IMAGE = 'https://cdn.shopify.com/s/files/1/0573/3269/5106/files/OLP-012.jpg?v=1736966252';
const OIP_055_IMAGE = 'https://cdn.shopify.com/s/files/1/0573/3269/5106/files/OLP-055.jpg?v=1736966215';
const OIP_081_IMAGE = 'https://cdn.shopify.com/s/files/1/0573/3269/5106/files/OLP-081_2aa1116a-cc79-46ae-aaed-165e8f5ebe9f.jpg?v=1757345136';
const OIP_096_IMAGE = 'https://cdn.shopify.com/s/files/1/0573/3269/5106/files/OLP-096.jpg?v=1736966426';
const OLP_001_IMAGE = 'https://cdn.shopify.com/s/files/1/0573/3269/5106/files/OLP-001.jpg';
const OLP_005_IMAGE = 'https://cdn.shopify.com/s/files/1/0573/3269/5106/files/OLP-005.jpg';
const OLP_012_IMAGE = 'https://cdn.shopify.com/s/files/1/0573/3269/5106/files/OLP-012.jpg';
const OLP_016_IMAGE = 'https://cdn.shopify.com/s/files/1/0573/3269/5106/files/OLP-016.jpg';
const OLP_019_IMAGE = 'https://cdn.shopify.com/s/files/1/0573/3269/5106/files/OLP-019.jpg';
const OLP_047_IMAGE = 'https://cdn.shopify.com/s/files/1/0573/3269/5106/files/OLP-047.jpg';
const OLP_049_IMAGE = 'https://cdn.shopify.com/s/files/1/0573/3269/5106/files/OLP-049.jpg';
const OLP_067_IMAGE = 'https://cdn.shopify.com/s/files/1/0573/3269/5106/files/OLP-067.jpg';
const OLP_078_IMAGE = 'https://cdn.shopify.com/s/files/1/0573/3269/5106/files/OLP-078.jpg';
const OLP_080_IMAGE = 'https://cdn.shopify.com/s/files/1/0573/3269/5106/files/OLP-080.jpg';
const OLP_088_IMAGE = 'https://cdn.shopify.com/s/files/1/0573/3269/5106/files/OLP-088.jpg';
const OLP_093_IMAGE = 'https://cdn.shopify.com/s/files/1/0573/3269/5106/files/OLP-093.jpg';
const OLP_099_IMAGE = 'https://cdn.shopify.com/s/files/1/0573/3269/5106/files/OLP-099.jpg';
const OLP_107_IMAGE = 'https://cdn.shopify.com/s/files/1/0573/3269/5106/files/OLP-107.jpg';
const OLP_124_IMAGE = 'https://cdn.shopify.com/s/files/1/0573/3269/5106/files/OLP-124.jpg';
const OLP_158_IMAGE = 'https://cdn.shopify.com/s/files/1/0573/3269/5106/files/OLP-158.jpg';
const TIRE_MICHELIN_PRIMACY_IMAGE = 'https://www.virtualllantas.com/media/catalog/product/cache/1/image/9df78eab33525d08d6e5fb8d27136e95/l/l/llanta_michelin_primacy_4_3_2.jpg';
const TIRE_MICHELIN_PILOT_SPORT_IMAGE = 'https://www.virtualllantas.com/media/catalog/product/cache/1/image/9df78eab33525d08d6e5fb8d27136e95/l/l/llanta_michelin_pilotsport_4suv_15_5.jpg';
const TIRE_BRIDGESTONE_IMAGE = 'https://scontent2.llantas.mx/images/508X636/models/Dueler_AT_Revo_2_5d0159ea67b28.jpg';
const TIRE_KUMHO_IMAGE = 'https://scontent2.llantas.mx/images/508X636/models/Crugen_Premium_KL33_5c3fac36675a5.jpg';
const TIRE_FULLRUN_FRUN_FOUR_IMAGE = 'https://scontent2.llantas.mx/images/508X636/models/Frun-Four_66cce228a2d15.jpg';
const TIRE_FULLRUN_FRUN_ONE_IMAGE = 'https://scontent2.llantas.mx/images/508X636/models/FRUN-ONE_5d5dac8372b47.jpg';
const TIRE_OVATION_VI682_IMAGE = 'https://www.virtualllantas.com/media/catalog/product/o/v/ovation_vi_682_9_1_27_28.jpg';
const TIRE_OVATION_VI388_IMAGE = 'https://www.virtualllantas.com/media/catalog/product/o/v/ovationvi388_attachedagcrmj1_10.jpg';
const TIRE_ALVENTI_IMAGE = 'https://scontent2.llantas.mx/images/508X636/models/Alventi_6943348fa5db7.jpg';
const TIRE_GALLANT_IMAGE = 'https://scontent2.llantas.mx/images/508X636/models/GL-16_6786d59ebfd67.jpg';
const TIRE_ECOVISION_IMAGE = 'https://scontent2.llantas.mx/images/508X636/models/Ecovision_VI-682_67eda5a469d6e.jpg';
const TIRE_FALLBACK_IMAGE = 'https://www.todosobreautos.com/content/images/2024/11/Tipos-de-Llantas-para-Autos.webp';
const WD40_AEROSOL_IMAGE = 'https://miguelgomez.com.co/wp-content/uploads/2024/10/LIC040-1.jpg';
const LITTLE_JOE_AIR_FRESHENER_IMAGE = 'https://www.faggidistribuciones.com.co/wp-content/uploads/2022/08/ambientador-little-joe-1.jpg';
const MEGUIARS_AIR_FRESHENER_IMAGE = 'https://www.faggidistribuciones.com.co/wp-content/uploads/2017/10/air-re-fresher-ultimate-scented-meguiar%C2%B4s-1.jpg';
const SHICK_AIR_TECH_IMAGE = 'https://lubriaceites.com/wp-content/uploads/2023/12/3201.jpg';
const SHICK_GEL_IMAGE = 'https://www.faggidistribuciones.com.co/wp-content/uploads/2019/07/ambientador-auto-fresco-gel-1.jpg';
const LUBRISTONE_AIR_FRESHENER_IMAGE = 'https://www.faggidistribuciones.com.co/wp-content/uploads/2014/11/ambientador-lubristone-1.jpg';
const BRAKE_FLUID_IMAGE = 'https://distribuidoraherca.com/wp-content/uploads/2024/10/DOT-3-liquido-para-frenos-ISIN-1P.png';
const CAR_BLOCK_PERFUME_IMAGE = 'https://superllantas.co/wp-content/uploads/2026/03/CarBlock-superllantas.jpg';
const ULTIMATE_BLACK_IMAGE = 'https://www.faggidistribuciones.com.co/wp-content/uploads/2020/11/meguiars-ultimate-black-1.jpg';
const PROLINER_TAPETES_IMAGE = 'https://expolujosgyg.com/wp-content/uploads/2022/07/proliner-2.jpg';
const FLP300_IMAGE = 'https://premiumfilters.store/cdn/shop/files/FLP-300.jpg?v=1736966521';
const LUBRISTONE_WINDSHIELD_CLEANER_IMAGE = 'https://lubristone.com/sitio/wp-content/uploads/2021/01/Limpia-parabrisas-Lubristone-570x450.jpg';
const LUBRISTONE_RED_COOLANT_IMAGE = 'https://lubristone.com/sitio/wp-content/uploads/2021/07/refrigerante-rojo.jpg';
const LUBRISTONE_GREEN_COOLANT_IMAGE = 'https://lubristone.com/sitio/wp-content/uploads/2021/07/refrigerante-verde.jpg';
const MEGUIARS_GOLD_CLASS_LEATHER_IMAGE = 'https://tpcolombia.com.co/wp-content/uploads/2024/11/G10916-removebg-preview.png';
const LYSOL_ODOR_ELIMINATOR_IMAGE = 'https://www.lysol.com.co/static/9c9a6df1df7c62f734c0ba953497ea8e/00fe5/Lizol_-_CO_-_es-CO-lds_crisp_linen_19oz.png';
const FILTER_OIL_098_IMAGE = 'https://premiumfilters.store/cdn/shop/files/OLP-098.jpg?v=1736966424';
const COOLANT_1GL_IMAGE = 'https://www.faggidistribuciones.com.co/wp-content/uploads/2020/07/refrigerante-radiador-naranja.jpg';
const VALVULA_TR413_IMAGE = 'https://insumosgn.com/wp-content/uploads/2023/02/VALVULA-SELLOMATIC-CAUCHO-TR413.png';
const MICROFIBER_CLOTH_IMAGE = 'https://www.faggidistribuciones.com.co/wp-content/uploads/2021/05/pano-microfibra.jpg';

export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function keywordImageForProduct(nombre: string, categoria?: string): string {
  const text = normalizeText(`${categoria || ''} ${nombre || ''}`);
  if (/\b(beam blade advance|bean blade|titan|softwiper rexion|plumilla|plumillas|plumillaa|plimilla|softwiper|wiper)\b/.test(text)) {
    return WIPER_IMAGE;
  }
  if (/\b(limpia|limpiador|limpiaparabrisas|lavaparabrisas|parabrisas|lavaparabrisa)\b/.test(text)) {
    return WINDSHIELD_CLEANER_IMAGE;
  }
  if (/\b(bujia|bujías|bujias)\b/.test(text)) {
    return SPARK_PLUG_IMAGE;
  }
  if (/\b(filtro|filtros)\b/.test(text)) {
    return FILTER_IMAGE;
  }
  if (/\b(aceite|oil|lubricante|lubricantes|motor)\b/.test(text)) {
    return OIL_CAN_IMAGE;
  }
  return '';
}

function tireImageForProduct(nombre: string, categoria?: string, id?: string): string {
  const text = `${categoria || ''} ${nombre || ''}`.trim().toLowerCase();
  const normalizedText = text
    .replace(/á/g, 'a')
    .replace(/é/g, 'e')
    .replace(/í/g, 'i')
    .replace(/ó/g, 'o')
    .replace(/ú/g, 'u')
    .replace(/ñ/g, 'n');
  if (normalizedText.includes('llanta') || normalizedText.includes('neumatico') || normalizedText.includes('rines')) {
    const hash = Array.from((id || nombre || '').toString()).reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const tireImgs = [TIRE_FALLBACK_IMAGE];
    return tireImgs[hash % tireImgs.length];
  }
  return '';
}

export function resolvedProductImage(p: { nombre: string; categoria?: string; icono?: string; imagen_url?: string | null; id?: string }): string {
  if (p.imagen_url) return p.imagen_url;

  const productName = (p.nombre || '').trim().toLowerCase();
  const cleanProductName = productName.replace(/\s+/g, '').replace(/-/g, '');
  const containsGalon = /galon|gallon|galón/.test(productName);

  if (containsGalon && cleanProductName.startsWith('mobil10w40')) {
    return MOBIL_10W40_GALON_IMAGE;
  }
  if (cleanProductName.startsWith('mobil10w40')) {
    return MOBIL_10W40_IMAGE;
  }
  if (containsGalon && cleanProductName.startsWith('mobil20w50')) {
    return MOBIL_20W50_GALON_IMAGE;
  }
  if (cleanProductName.startsWith('mobil20w50')) {
    return MOBIL_20W50_IMAGE;
  }
  const containsGL = /\bgl\b/.test(productName) || cleanProductName.endsWith('gl');
  if (containsGL && cleanProductName.startsWith('mobilsuper200010w30')) {
    return MOBIL_SUPER_2000_10W30_GL_IMAGE;
  }
  if (cleanProductName.startsWith('mobilsuper200010w30')) {
    return MOBIL_SUPER_2000_10W30_IMAGE;
  }
  if ((containsGL || containsGalon) && cleanProductName.startsWith('mobilsuper30005w30')) {
    return MOBIL_SUPER_3000_5W30_GL_IMAGE;
  }
  if (cleanProductName.startsWith('mobilsuper30005w30')) {
    return MOBIL_SUPER_3000_5W30_IMAGE;
  }
  if ((containsGL || containsGalon) && cleanProductName.startsWith('mobilsuper30005w40')) {
    return MOBIL_SUPER_3000_5W40_GL_IMAGE;
  }
  if (cleanProductName.startsWith('mobilsuper30005w40')) {
    return MOBIL_SUPER_3000_5W40_IMAGE;
  }
  if (containsGL && cleanProductName.startsWith('mobil10w20')) {
    return MOBIL_1_0W20_GL_IMAGE;
  }
  if (cleanProductName.startsWith('mobil1ow20')) {
    return MOBIL_1_0W20_IMAGE;
  }
  if (cleanProductName.startsWith('mobil10w20')) {
    return MOBIL_1_0W20_IMAGE;
  }
  if (cleanProductName.startsWith('movil1advancesintetyc5w30') || cleanProductName.startsWith('mobil1advancesintetyc5w30') || cleanProductName.startsWith('mobil1advancedsynthetic5w30')) {
    return MOBIL_1_ADVANCE_5W30_IMAGE;
  }
  if (cleanProductName.replace(/\./g, '').startsWith('mobilatfdm') || /atf\s*d\/?m/.test(productName)) {
    return MOBIL_ATF_DM_IMAGE;
  }
  if (cleanProductName.replace(/\./g, '').includes('mxesp') || /mx\s*esp/i.test(productName)) {
    if (containsGL || containsGalon) {
      return MOBIL_DELVAC_MX_ESP_15W40_GL_IMAGE;
    }
    return MOBIL_DELVAC_MX_ESP_15W40_IMAGE;
  }
  if (cleanProductName.startsWith('mobildelvacmoderm15w40fullpro') || (cleanProductName.startsWith('mobildelvacmoderm15w40') && (containsGL || containsGalon))) {
    return MOBIL_DELVAC_MODERM_15W40_GL_IMAGE;
  }
  if (cleanProductName.startsWith('mobildelvanmoderm15w40') || cleanProductName.startsWith('mobildelvacmoderm15w40')) {
    return MOBIL_DELVAC_MODERM_15W40_CUARTO_IMAGE;
  }
  if (containsGL && cleanProductName.startsWith('mobilsuper20005w20')) {
    return MOBIL_SUPER_2000_5W20_IMAGE;
  }
  if (cleanProductName.startsWith('mobilsuper20005w20')) {
    return MOBIL_SUPER_2000_5W20_IMAGE;
  }
  if (cleanProductName.startsWith('mobilsuper100020w50gi') || (containsGL && cleanProductName.startsWith('mobilsuper100020w50'))) {
    return MOBIL_SUPER_1000_20W50_GL_IMAGE;
  }
  if (cleanProductName.startsWith('mobilsuper100020w50')) {
    return MOBIL_SUPER_1000_20W50_IMAGE;
  }
  if (cleanProductName.startsWith('mobilsuper5w30gl')) {
    return MOBIL_SUPER_3000_5W30_GL_IMAGE;
  }
  if (cleanProductName.includes('5w30esp') || cleanProductName.startsWith('mobil5w30esp')) {
    return MOBIL_5W30_ESP_IMAGE;
  }
  if (cleanProductName.startsWith('mobilhidraulico') || (cleanProductName.includes('mobil') && productName.includes('hidraulico'))) {
    return MOBIL_HIDRAULICO_10W_IMAGE;
  }
  if (containsGL && cleanProductName.startsWith('shellhelixultra5w30')) {
    return SHELL_HELIX_ULTRA_5W30_GL_IMAGE;
  }
  if (cleanProductName.startsWith('shellhelixultra5w30')) {
    return SHELL_HELIX_ULTRA_5W30_IMAGE;
  }
  if (containsGL && cleanProductName.startsWith('shellhelixultra5w40')) {
    return SHELL_HELIX_ULTRA_5W40_GL_IMAGE;
  }
  if (cleanProductName.startsWith('shellhelixultra5w40')) {
    return SHELL_HELIX_ULTRA_5W40_IMAGE;
  }
  if (containsGL && cleanProductName.startsWith('shellhelixultra0w20')) {
    return SHELL_HELIX_ULTRA_0W20_GL_IMAGE;
  }
  if (cleanProductName.startsWith('shellhelixultra0w20')) {
    return SHELL_HELIX_ULTRA_0W20_IMAGE;
  }
  if (containsGL && cleanProductName.replace(/\./g, '').startsWith('shellhelixultra20w50')) {
    return SHELL_HELIX_ULTRA_20W50_GL_IMAGE;
  }
  if (cleanProductName.startsWith('shell10w30')) {
    return SHELL_10W30_IMAGE;
  }
  if (containsGL && cleanProductName.replace(/\./g, '').startsWith('terpeloiltec10w40')) {
    return TERPEL_OILTEC_10W40_GL_IMAGE;
  }
  if (containsGL && cleanProductName.replace(/\./g, '').startsWith('terpeloiltec20w50')) {
    return TERPEL_OILTEC_20W50_GL_IMAGE;
  }
  if (cleanProductName.replace(/\./g, '').startsWith('terpeloiltec20w50')) {
    return TERPEL_OILTEC_20W50_IMAGE;
  }
  if (cleanProductName.startsWith('acp007') || /^acp[- ]?007$/i.test(productName.trim())) {
    return ACP_007_IMAGE;
  }
  if (cleanProductName.startsWith('acp013') || /^acp[- ]?013$/i.test(productName.trim())) {
    return ACP_013_IMAGE;
  }
  if (cleanProductName.startsWith('acp014') || /^acp[- ]?014$/i.test(productName.trim())) {
    return ACP_014_IMAGE;
  }
  if (cleanProductName.startsWith('acp096') || /^acp[- ]?096$/i.test(productName.trim())) {
    return ACP_096_IMAGE;
  }
  if (cleanProductName.startsWith('acp132') || /^acp[- ]?132$/i.test(productName.trim())) {
    return ACP_132_IMAGE;
  }
  if (cleanProductName.startsWith('acp138') || /^acp[- ]?138$/i.test(productName.trim())) {
    return ACP_138_IMAGE;
  }
  if (cleanProductName.includes('acp109')) {
    return ACP_109_IMAGE;
  }
  if (cleanProductName.startsWith('acp069') || cleanProductName.startsWith('acp067')) {
    return ACP_IMAGE;
  }
  if (cleanProductName.startsWith('aip667') || cleanProductName.includes('aip667')) {
    return AIP_667_IMAGE;
  }
  if (cleanProductName.startsWith('aip744') || cleanProductName.includes('aip744')) {
    return AIP_744_IMAGE;
  }
  if (cleanProductName.startsWith('aip781')) {
    return AIP_781_IMAGE;
  }
  if (cleanProductName.startsWith('aip844')) {
    return AIP_844_IMAGE;
  }
  if (cleanProductName.startsWith('aip860')) {
    return AIP_860_IMAGE;
  }
  if (cleanProductName.startsWith('aip864') || cleanProductName.includes('aip864')) {
    return AIP_864_IMAGE;
  }
  if (cleanProductName.startsWith('aip889')) {
    return AIP_889_IMAGE;
  }
  if (cleanProductName.startsWith('aip899') || cleanProductName.includes('aip899')) {
    return AIP_899_IMAGE;
  }
  if (cleanProductName.startsWith('aip968')) {
    return AIP_968_IMAGE;
  }
  if (cleanProductName.startsWith('aip977')) {
    return AIP_977_IMAGE;
  }
  if (cleanProductName.startsWith('aip1050')) {
    return AIP_1050_IMAGE;
  }
  if (cleanProductName.startsWith('aip1084')) {
    return AIP_1084_IMAGE;
  }
  if (cleanProductName.startsWith('aip1118')) {
    return AIP_1118_IMAGE;
  }
  if (cleanProductName.startsWith('aip1123')) {
    return AIP_1123_IMAGE;
  }
  if (cleanProductName.startsWith('aip1135')) {
    return AIP_1135_IMAGE;
  }
  if (cleanProductName.startsWith('aip1138')) {
    return AIP_1138_IMAGE;
  }
  if (cleanProductName.startsWith('aip1141')) {
    return AIP_1141_IMAGE;
  }
  if (cleanProductName.startsWith('aip1146')) {
    return AIP_1146_IMAGE;
  }
  if (cleanProductName.startsWith('havoline5w30')) {
    return HAVOLINE_5W30_IMAGE;
  }
  if ((containsGL || containsGalon) && cleanProductName.startsWith('havolineck415w40')) {
    return CHEVRON_HAVOLINE_CK4_15W40_GL_IMAGE;
  }
  if (cleanProductName.startsWith('havolineshevronck415w40') || cleanProductName.startsWith('havolineck415w40')) {
    return CHEVRON_HAVOLINE_CK4_15W40_IMAGE;
  }
  if (cleanProductName.startsWith('chevronhavolineck415w401gln')) {
    return CHEVRON_HAVOLINE_CK4_15W40_GL_IMAGE;
  }
  if (cleanProductName.startsWith('chevronhavolineck415w40')) {
    return CHEVRON_HAVOLINE_CK4_15W40_IMAGE;
  }
  const isChevron20W50 = cleanProductName.includes('hevron20w50');
  if (isChevron20W50 && (containsGL || containsGalon)) {
    return CHEVRON_20W50_GL_IMAGE;
  }
  if (isChevron20W50) {
    return CHEVRON_20W50_IMAGE;
  }
  if (cleanProductName.includes('extintor')) {
    return EXTINTOR_5_LIBRAS_IMAGE;
  }
  if (cleanProductName.startsWith('oip005')) {
    return OIP_005_IMAGE;
  }
  if (cleanProductName.startsWith('oip006')) {
    return OIP_006_IMAGE;
  }
  if (cleanProductName.startsWith('oip008')) {
    return OIP_008_IMAGE;
  }
  if (cleanProductName.startsWith('oip010')) {
    return OIP_010_IMAGE;
  }
  if (cleanProductName.startsWith('oip012')) {
    return OIP_012_IMAGE;
  }
  if (cleanProductName.startsWith('oip055')) {
    return OIP_055_IMAGE;
  }
  if (cleanProductName.startsWith('oip081')) {
    return OIP_081_IMAGE;
  }
  if (cleanProductName.startsWith('oip096')) {
    return OIP_096_IMAGE;
  }
  if (cleanProductName.includes('olp107') || cleanProductName.includes('ef107')) {
    return OLP_107_IMAGE;
  }
  if (cleanProductName.includes('olp001')) {
    return OLP_001_IMAGE;
  }
  if (cleanProductName.includes('olp005')) {
    return OLP_005_IMAGE;
  }
  if (cleanProductName.includes('olp012')) {
    return OLP_012_IMAGE;
  }
  if (cleanProductName.includes('olp016')) {
    return OLP_016_IMAGE;
  }
  if (cleanProductName.includes('olp019')) {
    return OLP_019_IMAGE;
  }
  if (cleanProductName.includes('olp047')) {
    return OLP_047_IMAGE;
  }
  if (cleanProductName.includes('olp049')) {
    return OLP_049_IMAGE;
  }
  if (cleanProductName.includes('olp067')) {
    return OLP_067_IMAGE;
  }
  if (cleanProductName.includes('olp078')) {
    return OLP_078_IMAGE;
  }
  if (cleanProductName.includes('olp080')) {
    return OLP_080_IMAGE;
  }
  if (cleanProductName.includes('olp088')) {
    return OLP_088_IMAGE;
  }
  if (cleanProductName.includes('olp093')) {
    return OLP_093_IMAGE;
  }
  if (cleanProductName.includes('olp099')) {
    return OLP_099_IMAGE;
  }
  if (cleanProductName.includes('olp124')) {
    return OLP_124_IMAGE;
  }
  if (cleanProductName.includes('olp158')) {
    return OLP_158_IMAGE;
  }
  if (cleanProductName.includes('alventi')) {
    return TIRE_ALVENTI_IMAGE;
  }
  if (cleanProductName.includes('bridgestone')) {
    return TIRE_BRIDGESTONE_IMAGE;
  }
  if (cleanProductName.includes('kumho')) {
    return TIRE_KUMHO_IMAGE;
  }
  if (cleanProductName.includes('frunone')) {
    return TIRE_FULLRUN_FRUN_ONE_IMAGE;
  }
  if (cleanProductName.includes('frunfour') || (cleanProductName.includes('fullrun') && cleanProductName.includes('four'))) {
    return TIRE_FULLRUN_FRUN_FOUR_IMAGE;
  }
  if (cleanProductName.includes('pilotsport')) {
    return TIRE_MICHELIN_PILOT_SPORT_IMAGE;
  }
  if (cleanProductName.includes('michelin')) {
    return TIRE_MICHELIN_PRIMACY_IMAGE;
  }
  if (cleanProductName.includes('ovation') && cleanProductName.includes('185/65r14')) {
    return TIRE_OVATION_VI682_IMAGE;
  }
  if (cleanProductName.includes('ovation')) {
    return TIRE_OVATION_VI388_IMAGE;
  }
  if (cleanProductName.includes('gallant')) {
    return TIRE_GALLANT_IMAGE;
  }
  if (cleanProductName.includes('ecovision')) {
    return TIRE_ECOVISION_IMAGE;
  }
  if (cleanProductName.startsWith('wd40aerosol') || cleanProductName.includes('wd40')) {
    return WD40_AEROSOL_IMAGE;
  }
  if (cleanProductName.includes('littlejoe')) {
    return LITTLE_JOE_AIR_FRESHENER_IMAGE;
  }
  if (cleanProductName.startsWith('ambientadormeguiars') || cleanProductName.includes('airrefresher') || cleanProductName.includes('airefreshner') || cleanProductName.includes('airefresher') || cleanProductName.includes('odroeliminador') || cleanProductName.includes('odordor')) {
    return MEGUIARS_AIR_FRESHENER_IMAGE;
  }
  if (cleanProductName.includes('shickairtech')) {
    return SHICK_AIR_TECH_IMAGE;
  }
  if (cleanProductName.startsWith('shickgelsimoniz')) {
    return SHICK_GEL_IMAGE;
  }
  if (cleanProductName.startsWith('lubristoneambientadorperfum') || cleanProductName.startsWith('ambientadorlubristone')) {
    return LUBRISTONE_AIR_FRESHENER_IMAGE;
  }
  if (cleanProductName.startsWith('liquidodefreno')) {
    return BRAKE_FLUID_IMAGE;
  }
  if (cleanProductName.startsWith('carblockperfumeparaautos')) {
    return CAR_BLOCK_PERFUME_IMAGE;
  }
  if (cleanProductName.startsWith('ultimateblack')) {
    return ULTIMATE_BLACK_IMAGE;
  }
  if (cleanProductName.startsWith('tapetesproliner')) {
    return PROLINER_TAPETES_IMAGE;
  }
  if (cleanProductName.startsWith('flp300')) {
    return FLP300_IMAGE;
  }
  if (cleanProductName.startsWith('limpiaparabrisalubristone')) {
    return LUBRISTONE_WINDSHIELD_CLEANER_IMAGE;
  }
  if (cleanProductName.startsWith('refrigeranterojo1/4')) {
    return LUBRISTONE_RED_COOLANT_IMAGE;
  }
  if (cleanProductName.startsWith('refrigeranteverde1/4')) {
    return LUBRISTONE_GREEN_COOLANT_IMAGE;
  }
  if (cleanProductName.startsWith('goldclassrichleatherspray')) {
    return MEGUIARS_GOLD_CLASS_LEATHER_IMAGE;
  }
  if (cleanProductName.startsWith('lysoleliminadordeolores')) {
    return LYSOL_ODOR_ELIMINATOR_IMAGE;
  }
  if (cleanProductName.startsWith('f/aceite098')) {
    return FILTER_OIL_098_IMAGE;
  }
  if (cleanProductName.startsWith('refrigerante1gln')) {
    return COOLANT_1GL_IMAGE;
  }
  if (cleanProductName.startsWith('válvulatr413') || cleanProductName.startsWith('valvulatr413')) {
    return VALVULA_TR413_IMAGE;
  }
  if (cleanProductName.startsWith('panola/microfibra') || cleanProductName.startsWith('panolamicroriba') || cleanProductName.startsWith('panolas')) {
    return MICROFIBER_CLOTH_IMAGE;
  }

  const keywordImage = keywordImageForProduct(p.nombre, p.categoria);
  if (keywordImage) {
    return keywordImage;
  }

  const tireImage = tireImageForProduct(p.nombre, p.categoria, p.id);
  if (tireImage) {
    return tireImage;
  }

  return productImage(p.icono, p.imagen_url);
}

export function serviceImage(icono?: string, url?: string | null): string {
  return url || SERVICE_IMAGES[icono || ''] || DEFAULT_SERVICE;
}

export function productImage(icono?: string, url?: string | null): string {
  return url || PRODUCT_IMAGES[icono || ''] || DEFAULT_PRODUCT;
}
