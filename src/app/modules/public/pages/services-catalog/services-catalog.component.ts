import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from 'src/app/core/services/api.service';
import { Servicio, FALLBACK_SERVICIOS, groupByCategoria } from 'src/app/shared/constants/servicios.data';

const CATEGORIA_META: Record<string, { icon: string; tagline: string }> = {
  'Servicios Básicos': { icon: '🚗', tagline: 'Lavado, encerado y grafitado' },
  'Combos': { icon: '📦', tagline: 'Paquetes con mejor precio' },
  'Servicios Detailing': { icon: '✨', tagline: 'Embellecimiento premium' },
  'Servicios Anticorrosivos': { icon: '🛡️', tagline: 'Protección y hidroblasting' },
  'Pintura': { icon: '🎨', tagline: 'Pintura, corrección y protección' },
  'Latonería': { icon: '🔧', tagline: 'Enderezada, golpes y carrocería' },
};

@Component({
  selector: 'app-services-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './services-catalog.component.html',
  styleUrl: './services-catalog.component.css'
})
export class ServicesCatalogComponent implements OnInit {
  categorias: string[] = [];
  grouped: Record<string, Servicio[]> = {};
  activeFilter = 'Todos';
  hoveredCard: string | null = null;
  hoveredPill: string | null = null;
  searchTerm = '';

  tipoVehiculo: 'auto' | 'camioneta' | 'moto' = 'auto';

  get filteredGrouped(): Record<string, Servicio[]> {
    const out: Record<string, Servicio[]> = {};
    for (const [cat, list] of Object.entries(this.grouped)) {
      let f = list;
      if (this.tipoVehiculo === 'moto') {
        f = f.filter(s => s.precio_moto != null && s.precio_moto > 0);
      }
      if (this.searchTerm.trim()) {
        f = f.filter(s => this.matchSearch(s));
      }
      if (f.length) out[cat] = f;
    }
    return out;
  }

  readonly brandName = 'Luxury Service Manga M&S';

  constructor(private api: ApiService) {
    const fb = groupByCategoria(FALLBACK_SERVICIOS);
    this.categorias = fb.categorias;
    this.grouped = fb.grouped;
  }

  ngOnInit() {
    if (typeof window === 'undefined') return;
    this.api.get<{ categorias: string[]; grouped: Record<string, Servicio[]> }>('/services/catalog').subscribe({
      next: res => {
        this.categorias = res.categorias;
        this.grouped = res.grouped;
      },
      error: () => {
        this.api.get<Servicio[]>('/services').subscribe({
          next: list => {
            const g = groupByCategoria(list);
            this.categorias = g.categorias;
            this.grouped = g.grouped;
          }
        });
      }
    });
  }

  meta(cat: string) {
    return CATEGORIA_META[cat] ?? { icon: '🔧', tagline: 'Servicios profesionales' };
  }

  filterCats(): string[] {
    const cats = this.activeFilter === 'Todos' ? this.categorias : this.categorias.filter(c => c === this.activeFilter);
    const g = this.filteredGrouped;
    return cats.filter(c => g[c]?.length);
  }

  setActiveCategory(cat: string) {
    this.activeFilter = cat;
  }

  showAll() {
    this.activeFilter = 'Todos';
  }

  formatPrice(n: number) {
    if (!n) return '—';
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
  }

  precioAuto(s: Servicio) { return s.precio_auto ?? s.precio_base; }
  precioCamioneta(s: Servicio) { return s.precio_camioneta ?? s.precio_base; }
  precioMoto(s: Servicio) { return s.precio_moto ?? s.precio_base; }
  precioActual(s: Servicio) {
    if (this.tipoVehiculo === 'auto') return this.precioAuto(s);
    if (this.tipoVehiculo === 'camioneta') return this.precioCamioneta(s);
    return this.precioMoto(s);
  }

  totalInCategory(cat: string) {
    return this.filteredGrouped[cat]?.length ?? 0;
  }

  private matchSearch(s: Servicio): boolean {
    const q = this.searchTerm.trim();
    if (!q) return true;
    const norm = (t: string) =>
      t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '');
    const words = norm(q).split(/\s+/).filter(w => w.length > 0);
    const haystack = norm(s.nombre + ' ' + (s.descripcion || '') + ' ' + (s.categoria || ''));
    return words.some(w => w.length >= 1 && haystack.includes(w));
  }
}
