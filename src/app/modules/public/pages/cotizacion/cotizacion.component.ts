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
  precio: number;
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
  categoriasProductos: string[] = [];
  loading = true;
  searchTerm = '';

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

  private buildItems() {
    const items: CotizacionItem[] = [];
    const cats = new Set<string>();
    for (const s of this.servicios) {
      items.push({
        id: s.id,
        nombre: s.nombre,
        precio: this.precioActual(s),
        tipo: 'servicio',
        seleccionado: false,
        cotizarLocal: !!s.cotizar_local
      });
      if (s.categoria) cats.add(s.categoria);
    }
    this.categoriasServicios = [...cats];
    const pCats = new Set<string>();
    for (const p of this.productos) {
      items.push({
        id: p.id,
        nombre: p.nombre,
        precio: p.precio,
        tipo: 'producto',
        seleccionado: false
      });
      if (p.categoria) pCats.add(p.categoria);
    }
    this.categoriasProductos = [...pCats];
    this.items = items;
  }

  private precioActual(s: Servicio) {
    if (this.tipoVehiculo === 'auto') return s.precio_auto ?? s.precio_base;
    if (this.tipoVehiculo === 'camioneta') return s.precio_camioneta ?? s.precio_base;
    return s.precio_moto ?? s.precio_base;
  }

  cambiarVehiculo(t: 'auto' | 'camioneta' | 'moto') {
    this.tipoVehiculo = t;
    for (const item of this.items) {
      if (item.tipo === 'servicio') {
        const s = this.servicios.find(sv => sv.id === item.id);
        if (s) {
          item.precio = this.precioActual(s);
          // Deselect services not available for moto
          if (t === 'moto' && (s.precio_moto == null || s.precio_moto <= 0)) {
            item.seleccionado = false;
          }
        }
      }
    }
  }

  get seleccionados(): CotizacionItem[] {
    return this.items.filter(i => i.seleccionado);
  }

  get total(): number {
    return this.seleccionados.reduce((sum, i) => sum + i.precio, 0);
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

  private buscaProducto(id: string): Producto | undefined {
    return this.productos.find(pr => pr.id === id);
  }

  serviciosPorCategoria(cat: string): CotizacionItem[] {
    return this.items.filter(i => {
      if (i.tipo !== 'servicio') return false;
      const s = this.buscaServicio(i.id);
      if (!s) return false;
      if (s.cotizar_local) return false;
      if (this.tipoVehiculo === 'moto' && (s.precio_moto == null || s.precio_moto <= 0)) return false;
      if (!this.matchSearch(i.nombre + ' ' + (s.descripcion || '') + ' ' + (s.categoria || ''))) return false;
      return s.categoria === cat;
    });
  }

  productosPorCategoria(cat: string): CotizacionItem[] {
    return this.items.filter(i => {
      if (i.tipo !== 'producto') return false;
      const p = this.buscaProducto(i.id);
      if (!this.matchSearch(i.nombre + ' ' + (p?.descripcion || '') + ' ' + (p?.categoria || ''))) return false;
      return p?.categoria === cat;
    });
  }

  formatPrice(n: number) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
  }
}
