import { Component, OnInit } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HERO_IMAGE } from 'src/app/shared/constants/catalog-images';
import { MARCAS_MULTIMARCAS } from 'src/app/shared/constants/marcas-multimarcas';
import { SiteFooterComponent } from 'src/app/shared/components/site-footer/site-footer.component';
import { FALLBACK_SERVICIOS, Servicio } from 'src/app/shared/constants/servicios.data';

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
    const q = this.searchTerm.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return this.servicios
      .filter(s => !s.cotizar_local)
      .filter(s => !q || s.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q))
      .slice(0, 6);
  }

  constructor(private router: Router) {}

  seleccionar(s: Servicio) {
    this.selected = s;
    this.searchTerm = '';
    this.searchFocused = false;
  }

  limpiarSeleccion() {
    this.selected = null;
  }

  agendar() {
    this.router.navigate(['/agendar-cita']);
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
