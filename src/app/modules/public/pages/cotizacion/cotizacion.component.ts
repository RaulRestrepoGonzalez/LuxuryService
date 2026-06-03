import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from 'src/app/core/services/api.service';
import { Servicio, FALLBACK_SERVICIOS } from 'src/app/shared/constants/servicios.data';

interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  categoria?: string;
  icono?: string;
  imagen_url?: string;
}

interface CotizacionItem {
  id: string;
  nombre: string;
  precioReferencia: number;
  tipo: 'servicio' | 'producto';
  seleccionado: boolean;
  cotizarLocal?: boolean;
}

@Component({
  selector: 'app-cotizacion',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './cotizacion.component.html',
  styleUrl: './cotizacion.component.css'
})
export class CotizacionComponent implements OnInit {
  tipoVehiculo: 'auto' | 'camioneta' | 'moto' = 'auto';
  servicios: Servicio[] = [];
  productos: Producto[] = [];
  items: CotizacionItem[] = [];
  categoriasServicios: string[] = [];
  loading = true;
  searchTerm = '';
  searchFocused = false;

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    if (typeof window === 'undefined') return;
    this.loadData();
  }

  private loadData() {
    this.api.get<Servicio[]>('/services').subscribe({
      next: s => {
        this.servicios = s;
        this.buildItems();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.servicios = FALLBACK_SERVICIOS;
        this.buildItems();
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
    this.api.get<Producto[]>('/products').subscribe({
      next: p => {
        this.productos = p;
        this.buildItems();
        this.cdr.markForCheck();
      },
      error: () => { this.cdr.markForCheck(); }
    });
  }

  private precioReferencia(s: Servicio) {
    const p = this.tipoVehiculo === 'auto'
      ? (s.precio_auto ?? s.precio_base)
      : this.tipoVehiculo === 'camioneta'
        ? (s.precio_camioneta ?? s.precio_base)
        : (s.precio_moto ?? s.precio_base);
    return p ?? 0;
  }

  private buildItems() {
    const items: CotizacionItem[] = [];
    const cats = new Set<string>();
    for (const s of this.servicios) {
      items.push({
        id: s.id,
        nombre: s.nombre,
        precioReferencia: this.precioReferencia(s),
        tipo: 'servicio',
        seleccionado: false,
        cotizarLocal: !!s.cotizar_local
      });
      if (s.categoria) cats.add(s.categoria);
    }
    this.categoriasServicios = [...cats];
    this.items = items;
  }

  cambiarVehiculo(t: 'auto' | 'camioneta' | 'moto') {
    this.tipoVehiculo = t;
    for (const item of this.items) {
      if (item.tipo === 'servicio') {
        const s = this.servicios.find(sv => sv.id === item.id);
        if (s) item.precioReferencia = this.precioReferencia(s);
      }
    }
  }

  formatPrecio(n: number) {
    if (!n) return '—';
    return '$' + new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n);
  }

  private matchSearch(text: string): boolean {
    const q = this.searchTerm.trim();
    if (!q) return true;
    const norm = (s: string) =>
      s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '');
    const words = norm(q).split(/\s+/).filter(w => w.length > 0);
    const haystack = norm(text);
    return words.some(w => w.length >= 1 && haystack.includes(w));
  }

  private buscaServicio(id: string): Servicio | undefined {
    return this.servicios.find(sv => sv.id === id);
  }

  serviciosPorCategoria(cat: string): CotizacionItem[] {
    return this.items.filter(i => {
      if (i.tipo !== 'servicio') return false;
      const s = this.buscaServicio(i.id);
      if (!s) return false;
      if (s.cotizar_local) return false;
      if (this.tipoVehiculo === 'moto') {
        if (!/\b(moto(s)?|motocicleta)\b/i.test(s.nombre)) return false;
      } else {
        const precio = this.tipoVehiculo === 'auto'
          ? (s.precio_auto ?? s.precio_base ?? 0)
          : (s.precio_camioneta ?? s.precio_base ?? 0);
        if (precio <= 0) return false;
      }
      if (!this.matchSearch(i.nombre + ' ' + (s.descripcion || '') + ' ' + (s.categoria || ''))) return false;
      return s.categoria === cat;
    });
  }

  categoriaEsLocal(cat: string): boolean {
    const items = this.items.filter(i => i.tipo === 'servicio');
    const enCat = items.filter(i => {
      const s = this.buscaServicio(i.id);
      return s?.categoria === cat;
    });
    return enCat.length > 0 && enCat.every(i => i.cotizarLocal);
  }

  get seleccionados(): CotizacionItem[] {
    return this.items.filter(i => i.seleccionado);
  }

  get total(): number {
    return this.seleccionados.reduce((sum, i) => sum + i.precioReferencia, 0);
  }

  get recomendados(): CotizacionItem[] {
    const combos = this.items.filter(i => {
      const s = this.buscaServicio(i.id);
      return s?.categoria === 'Combos' && !i.cotizarLocal;
    });
    const basicos = this.items.filter(i => {
      const s = this.buscaServicio(i.id);
      return s?.categoria === 'Servicios Básicos' && !i.cotizarLocal;
    });
    return [...combos, ...basicos].slice(0, 8);
  }

  buscarRecomendado(item: CotizacionItem) {
    this.searchTerm = item.nombre;
    this.searchFocused = false;
  }
}