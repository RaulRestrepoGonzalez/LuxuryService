import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ApiService } from 'src/app/core/services/api.service';
import { Servicio, FALLBACK_SERVICIOS, groupByCategoria, sortByNombreNatural } from 'src/app/shared/constants/servicios.data';

const icon = (file: string) => `<img src="/${file}" alt="" class="svc-custom-icon">`;

const CATEGORIA_META: Record<string, { icon: string; tagline: string }> = {
  'Lavado y Detailing': { icon: icon('Lavado y Detailing.png'), tagline: 'Lavado general, motor, express y premium' },
  'Combos': { icon: icon('Combos.png'), tagline: 'Paquetes con mejor precio' },
  'Detailing y Protección': { icon: icon('Detailing y Protección.png'), tagline: 'Embellecimiento, sellado y nanocerámico' },
  'Limpieza Profunda': { icon: icon('Limpieza Profunda.png'), tagline: 'Tapicería, techos, pisos y cojinería' },
  'Serviteca': { icon: icon('serviteca.png'), tagline: 'Alineación, balanceo y rotación' },
  'Polarizados': { icon: icon('Polarizados.png'), tagline: 'Película nanocerámica para vidrios' },
  'Farolas': { icon: icon('Farolas.png'), tagline: 'Pulido y sellado de farolas' },
  'Rines': { icon: icon('Rines.png'), tagline: 'Limpieza, descontaminación y sellado' },
  'Hidroblasting': { icon: icon('Hidroblasting.png'), tagline: 'Hidrolavado y retoque profesional' },
  'Protección': { icon: icon('Protección.png'), tagline: 'Anticorrosiva y sellamiento' },
  'Diagnóstico': { icon: icon('Diagnóstico.png'), tagline: 'Scaner electrónico e inyectores' },
  'Adicionales': { icon: icon('Adicionales.png'), tagline: 'Insumos, domicilios y aplicaciones' },
  'Latonería y Carrocería': { icon: icon('Latonería y Carrocería.png'), tagline: 'Enderezada, golpes y carrocería' },
  'Pintura y Acabados': { icon: icon('Pintura y Acabados.png'), tagline: 'Pintura, corrección y protección' },
  'Mecánica General': { icon: icon('Mecánica General.png'), tagline: 'Frenos, motor, suspensión y más' },
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

  constructor(private api: ApiService, private sanitizer: DomSanitizer, private router: Router) {
    const fb = groupByCategoria(FALLBACK_SERVICIOS);
    this.categorias = fb.categorias;
    const sorted: Record<string, Servicio[]> = {};
    for (const [cat, list] of Object.entries(fb.grouped)) {
      sorted[cat] = sortByNombreNatural(list);
    }
    this.grouped = sorted;
  }

  ngOnInit() {
    if (typeof window === 'undefined') return;
    this.api.get<{ categorias: string[]; grouped: Record<string, Servicio[]> }>('/services/catalog').subscribe({
      next: res => {
        this.categorias = res.categorias;
        const sorted: Record<string, Servicio[]> = {};
        for (const [cat, list] of Object.entries(res.grouped)) {
          sorted[cat] = sortByNombreNatural(list);
        }
        this.grouped = sorted;
      },
      error: () => {
        this.api.get<Servicio[]>('/services').subscribe({
          next: list => {
            const g = groupByCategoria(list);
            this.categorias = g.categorias;
            const sorted: Record<string, Servicio[]> = {};
            for (const [cat, catList] of Object.entries(g.grouped)) {
              sorted[cat] = sortByNombreNatural(catList);
            }
            this.grouped = sorted;
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

  agendar(servicioId: string) {
    this.router.navigate(['/agendar-cita'], { queryParams: { servicio: servicioId } });
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
