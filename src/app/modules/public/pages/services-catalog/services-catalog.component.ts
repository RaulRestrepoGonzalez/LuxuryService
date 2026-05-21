import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from 'src/app/core/services/api.service';
import { serviceImage } from 'src/app/shared/constants/catalog-images';
import { Servicio, FALLBACK_SERVICIOS, groupByCategoria } from 'src/app/shared/constants/servicios.data';

const CATEGORIA_META: Record<string, { accent: 'red' | 'black'; tagline: string }> = {
  'Servicios Básicos': { accent: 'red', tagline: 'Lavado, encerado y grafitado' },
  'Combos': { accent: 'red', tagline: 'Paquetes con mejor precio' },
  'Servicios Detailing': { accent: 'black', tagline: 'Embellecimiento premium' },
  'Servicios Anticorrosivos': { accent: 'red', tagline: 'Protección y hidroblasting' },
};

@Component({
  selector: 'app-services-catalog',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './services-catalog.component.html',
  styleUrl: './services-catalog.component.css'
})
export class ServicesCatalogComponent implements OnInit {
  categorias: string[] = [];
  grouped: Record<string, Servicio[]> = {};
  activeFilter = 'Todos';
  hoveredCard: string | null = null;

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
    return CATEGORIA_META[cat] ?? { accent: 'black' as const, tagline: 'Servicios profesionales' };
  }

  filterCats(): string[] {
    if (this.activeFilter === 'Todos') return this.categorias;
    return this.categorias.filter(c => c === this.activeFilter);
  }

  img(s: Servicio) { return serviceImage(s.icono, s.imagen_url); }

  formatPrice(n: number) {
    if (!n) return '—';
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
  }

  precioAuto(s: Servicio) { return s.precio_auto ?? s.precio_base; }
  precioCamioneta(s: Servicio) { return s.precio_camioneta ?? s.precio_base; }

  totalInCategory(cat: string) {
    return this.grouped[cat]?.length ?? 0;
  }
}
