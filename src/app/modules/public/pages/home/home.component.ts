import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HERO_IMAGE } from 'src/app/shared/constants/catalog-images';
import { MARCAS_MULTIMARCAS } from 'src/app/shared/constants/marcas-multimarcas';
import { SiteFooterComponent } from 'src/app/shared/components/site-footer/site-footer.component';
import { FALLBACK_SERVICIOS, Servicio, sortByNombreNatural } from 'src/app/shared/constants/servicios.data';
import { ApiService } from 'src/app/core/services/api.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, SiteFooterComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  heroImage = HERO_IMAGE;
  marcas = MARCAS_MULTIMARCAS;
  searchTerm = '';
  searchFocused = false;
  servicios = FALLBACK_SERVICIOS;
  selected: Servicio | null = null;

  get recomendadosFiltrados() {
    const raw = this.searchTerm.trim().toLowerCase();
    if (!raw) return this.servicios.slice(0, 50);
    const q = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const tokens = q.split(/\s+/).filter(Boolean);
    return this.servicios.filter(s => {
      const name = s.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return tokens.some(t => name.includes(t));
    }).slice(0, 50);
  }

  constructor(private router: Router, private api: ApiService) {}

  onBlur() {
    setTimeout(() => this.searchFocused = false, 200);
  }

  seleccionar(s: Servicio) {
    this.selected = s;
    this.searchTerm = '';
    this.searchFocused = false;
  }

  limpiarSeleccion() {
    this.selected = null;
  }

  agendar() {
    if (!this.selected) return;
    this.router.navigate(['/agendar-cita'], { queryParams: { servicio: this.selected.id, tipo: 'auto' } });
  }

  formatPrecio(n: number) {
    if (!n) return '';
    return '$' + new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n);
  }

  contacto = {
    direccion: 'Av. Principal Manga, Cartagena, Colombia',
    horario: 'Lunes - Sábado: 7:00 a.m. - 7:00 p.m. · Domingo: 7:00 a.m. - 2:00 p.m',
    telefono: '+57 (605) 234 5678',
    telefonoRaw: '+576052345678',
    email: 'luxury_admon@outlook.com',
    whatsapp: '+57 300 636 6429',
    whatsappRaw: '573006366429'
  };

  ngOnInit() {
    if (typeof window === 'undefined') return;
    this.api.get<any[]>('/services').subscribe({
      next: res => {
        if (res && res.length > 0) {
          const fallbackIds = new Set(FALLBACK_SERVICIOS.map(s => s.id));
          const nuevos = res.filter((s: any) => !fallbackIds.has(s.id) && s.nombre).map((s: any) => ({
            id: s._id || s.id,
            nombre: s.nombre,
            descripcion: s.descripcion || '',
            duracion_minutos: s.duracion_minutos || 0,
            precio_base: s.precio_base || s.precio_auto || 0,
            precio_auto: s.precio_auto || 0,
            precio_camioneta: s.precio_camioneta || 0,
            precio_moto: s.precio_moto || 0,
            categoria: s.categoria || 'Otros',
            cotizar_local: s.cotizar_local || false,
            agendable: s.agendable !== false,
            iva_incluido: s.iva_incluido || true,
            icono: s.icono || '',
            imagen_url: s.imagen_url || '',
          }));
          this.servicios = sortByNombreNatural([...FALLBACK_SERVICIOS, ...nuevos]);
        }
      }
    });
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
