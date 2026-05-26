import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from 'src/app/core/services/api.service';
import { HERO_IMAGE } from 'src/app/shared/constants/catalog-images';
import { MARCAS_MULTIMARCAS } from 'src/app/shared/constants/marcas-multimarcas';
import { SiteFooterComponent } from 'src/app/shared/components/site-footer/site-footer.component';
import { FALLBACK_SERVICIOS, groupByCategoria } from 'src/app/shared/constants/servicios.data';

interface Servicio {
  id: string;
  nombre: string;
  precio_auto: number;
  precio_camioneta: number;
  precio_base?: number;
  categoria?: string;
  cotizar_local?: boolean;
}

const CATEGORIAS_VISIBLES = new Set([
  'Lavado y Detailing', 'Combos', 'Detailing y Protección',
  'Limpieza Profunda', 'Mantenimiento Básico', 'Protección',
  'Hidroblasting', 'Polarizados', 'Faros',
  'Rines', 'Diagnóstico', 'Adicionales'
]);

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, CommonModule, SiteFooterComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  heroImage = HERO_IMAGE;
  marcas = MARCAS_MULTIMARCAS;
  tarifarioCategorias: string[] = [];
  tarifarioGrouped: Record<string, Servicio[]> = {};
  loadingTarifario = true;

  contacto = {
    direccion: 'Av. Principal Manga, Cartagena, Colombia',
    horario: 'Lunes - Sábado: 8:00 a.m. - 6:00 p.m. · Domingo: cerrado',
    telefono: '+57 (605) 234 5678',
    telefonoRaw: '+576052345678',
    email: 'contacto@luxuryservice.co',
    whatsapp: '+57 300 000 0000',
    whatsappRaw: '573000000000'
  };

  constructor(private api: ApiService) {}

  ngOnInit() {
    if (typeof window === 'undefined') return;

    const fallback = groupByCategoria(FALLBACK_SERVICIOS);
    this.tarifarioCategorias = fallback.categorias;
    this.tarifarioGrouped = fallback.grouped;
    this.loadingTarifario = false;

    this.api.get<{ categorias: string[]; grouped: Record<string, Servicio[]> }>('/services/catalog').subscribe({
      next: res => {
        const categorias = res.categorias.filter(c => CATEGORIAS_VISIBLES.has(c));
        const grouped: Record<string, Servicio[]> = {};
        for (const c of categorias) {
          grouped[c] = (res.grouped[c] || []).filter(s => !s.cotizar_local);
        }
        if (categorias.length > 0) {
          this.tarifarioCategorias = categorias;
          this.tarifarioGrouped = grouped;
        }
      },
      error: () => {}
    });
  }

  formatPrice(n: number) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n ?? 0);
  }

  onLogoError(ev: Event, nombre: string) {
    const img = ev.target as HTMLImageElement;
    img.style.display = 'none';
    const parent = img.parentElement;
    if (parent && !parent.querySelector('.brand-fallback')) {
      const span = document.createElement('span');
      span.className = 'brand-fallback';
      span.textContent = nombre;
      parent.appendChild(span);
    }
  }
}
