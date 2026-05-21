const ICON_MAP: Record<string, string> = {
  oil_barrel: '⛽',
  local_car_wash: '✨',
  tire_repair: '🛞',
  window: '🪟',
  water_drop: '💧',
  filter_alt: '🔧',
  cleaning_services: '🧽',
  auto_awesome: '✦',
  air: '🌸',
  brightness_7: '☀',
  inventory_2: '📦',
  build: '🔩',
  directions_car: '🚗'
};

export function materialIcon(name?: string): string {
  return ICON_MAP[name || ''] || '◆';
}
