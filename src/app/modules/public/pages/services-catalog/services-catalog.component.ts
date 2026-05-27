import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ApiService } from 'src/app/core/services/api.service';
import { Servicio, FALLBACK_SERVICIOS, groupByCategoria } from 'src/app/shared/constants/servicios.data';

const VACUUM_IMG = '<img src="/aspiradora.png" alt="" class="svc-custom-icon">';
const SPRAY_GUN_IMG = '<img src="/pistola-de-pintura.png" alt="" class="svc-custom-icon svc-custom-icon--sm">';

const CATEGORIA_META: Record<string, { icon: string; tagline: string }> = {
  'Lavado y Detailing': { icon: '🚗', tagline: 'Lavado general, motor, express y premium' },
  'Combos': { icon: '🏆', tagline: 'Paquetes con mejor precio' },
  'Detailing y Protección': { icon: '🧽', tagline: 'Embellecimiento, sellado y nanocerámico' },
  'Limpieza Profunda': { icon: VACUUM_IMG, tagline: 'Tapicería, techos, pisos y cojinería' },
  'Serviteca': { icon: '🔧', tagline: 'Alineación, balanceo y rotación' },
  'Polarizados': { icon: '🌑', tagline: 'Película nanocerámica para vidrios' },
  'Farolas': { icon: '💡', tagline: 'Pulido y sellado de farolas' },
  'Rines': { icon: '🛞', tagline: 'Limpieza, descontaminación y sellado' },
  'Hidroblasting': { icon: '💧', tagline: 'Hidrolavado y retoque profesional' },
  'Protección': { icon: '🛡️', tagline: 'Anticorrosiva y sellamiento' },
  'Diagnóstico': { icon: '🔍', tagline: 'Scaner electrónico e inyectores' },
  'Adicionales': { icon: '➕', tagline: 'Insumos, domicilios y aplicaciones' },
  'Latonería y Carrocería': { icon: '🔧', tagline: 'Enderezada, golpes y carrocería' },
  'Pintura y Acabados': { icon: SPRAY_GUN_IMG, tagline: 'Pintura, corrección y protección' },
  'Mecánica General': { icon: '⚙️', tagline: 'Frenos, motor, suspensión y más' },
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

  private readonly CAT_SIEMPRE_VISIBLE = new Set(['Latonería y Carrocería', 'Pintura y Acabados', 'Mecánica General']);

  get filteredGrouped(): Record<string, Servicio[]> {
    const out: Record<string, Servicio[]> = {};
    for (const [cat, list] of Object.entries(this.grouped)) {
      let f = list;
      if (this.CAT_SIEMPRE_VISIBLE.has(cat)) {
        // Siempre mostrar estas categorías sin filtrar por vehículo
      } else if (this.tipoVehiculo === 'moto') {
        f = f.filter(s => /\b(moto(s)?|motocicleta)\b/i.test(s.nombre));
      } else {
        const getPrecio = this.tipoVehiculo === 'auto'
          ? (s: Servicio) => s.precio_auto ?? s.precio_base ?? 0
          : (s: Servicio) => s.precio_camioneta ?? s.precio_base ?? 0;
        f = f.filter(s => getPrecio(s) > 0);
      }
      if (this.searchTerm.trim()) {
        f = f.filter(s => this.matchSearch(s));
      }
      if (f.length) out[cat] = f;
    }
    return out;
  }

  readonly brandName = 'Luxury Service Manga M&S';

  esCategoriaGray(cat: string): boolean {
    return this.CAT_SIEMPRE_VISIBLE.has(cat);
  }

  constructor(private api: ApiService, private sanitizer: DomSanitizer) {
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

  meta(cat: string): { icon: SafeHtml; tagline: string } {
    const m = CATEGORIA_META[cat];
    if (!m) return { icon: this.sanitizer.bypassSecurityTrustHtml('🔧'), tagline: 'Servicios profesionales' };
    return { icon: this.sanitizer.bypassSecurityTrustHtml(m.icon), tagline: m.tagline };
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
