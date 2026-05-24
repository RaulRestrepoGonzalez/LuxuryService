import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService } from 'src/app/core/services/api.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { productImage } from 'src/app/shared/constants/catalog-images';

export interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  categoria?: string;
  icono?: string;
  imagen_url?: string;
}

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './shop.component.html',
  styleUrl: './shop.component.css'
})
export class ShopComponent implements OnInit, OnDestroy {
  productos: Producto[] = [];
  filtered: Producto[] = [];
  destacados: Producto[] = [];
  loading = true;
  error = '';
  purchasing: string | null = null;
  activeCategory = 'Todos';
  categories: string[] = ['Todos'];
  toast = '';
  toastVisible = false;
  private refreshSub: Subscription | null = null;
  private scrollInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private api: ApiService,
    public auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    if (typeof window === 'undefined') return;
    this.loadProducts();
    this.refreshSub = this.api.refresh$.subscribe(({ key, value }) => {
      if (key === '/products') {
        this.productos = value as Producto[];
        this.destacados = this.productos.slice(0, 8);
        this.buildCategories();
        this.applyFilter();
        this.cdr.markForCheck();
      }
    });
    this.startAutoScroll();
  }

  ngOnDestroy() {
    this.refreshSub?.unsubscribe();
    this.stopAutoScroll();
  }

  loadProducts() {
    this.loading = true;
    this.error = '';
    this.api.getFresh<Producto[]>('/products').subscribe({
      next: res => {
        this.productos = res;
        this.destacados = this.productos.slice(0, 8);
        this.buildCategories();
        this.applyFilter();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: err => {
        this.error = err?.status === 0 ? 'No se pudo conectar con el servidor' : 'Error al cargar productos';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private buildCategories() {
    const cats = [...new Set(this.productos.map(p => p.categoria).filter(Boolean))] as string[];
    this.categories = ['Todos', ...cats];
  }

  filterCategory(cat: string) {
    this.activeCategory = cat;
    this.applyFilter();
  }

  img(p: Producto) { return productImage(p.icono, p.imagen_url); }

  stockClass(stock: number): string {
    if (stock <= 0) return 'out';
    if (stock <= 5) return 'low';
    return '';
  }

  formatPrice(n: number) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
  }

  private startAutoScroll() {
    if (typeof window === 'undefined') return;
    const el = () => document.querySelector('.featured-carousel');
    this.scrollInterval = setInterval(() => {
      const c = el();
      if (!c || c.matches(':hover')) return;
      const maxScroll = c.scrollWidth - c.clientWidth;
      if (c.scrollLeft >= maxScroll - 10) {
        c.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        c.scrollBy({ left: c.clientWidth, behavior: 'smooth' });
      }
    }, 4000);
  }

  private stopAutoScroll() {
    if (this.scrollInterval) {
      clearInterval(this.scrollInterval);
      this.scrollInterval = null;
    }
  }

  comprar(p: Producto) {
    if (!this.auth.isLoggedIn()) {
      this.showToast('Inicia sesión para comprar');
      return;
    }
    if (p.stock <= 0) return;
    this.purchasing = p.id;
    this.api.post('/purchase', { productoId: p.id, cantidad: 1 }).subscribe({
      next: () => {
        this.purchasing = null;
        this.showToast(`${p.nombre} agregado a tu compra`);
        this.loadProducts();
      },
      error: err => {
        this.purchasing = null;
        this.showToast(err?.error?.error || 'Error al procesar la compra');
      }
    });
  }

  private showToast(msg: string) {
    this.toast = msg;
    this.toastVisible = true;
    setTimeout(() => { this.toastVisible = false; }, 3200);
  }

  private applyFilter() {
    this.filtered = this.activeCategory === 'Todos'
      ? this.productos
      : this.productos.filter(p => p.categoria === this.activeCategory);
  }
}
