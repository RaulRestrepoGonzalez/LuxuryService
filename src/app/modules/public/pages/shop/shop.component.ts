import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService } from 'src/app/core/services/api.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { productImage } from 'src/app/shared/constants/catalog-images';

const TIRE_IMAGE = 'https://source.unsplash.com/featured/400x400/?tire';
const CATEGORY_IMAGES: Record<string, string> = {
  llantas: TIRE_IMAGE,
  llanta: TIRE_IMAGE,
  neumáticos: TIRE_IMAGE,
  neumaticos: TIRE_IMAGE,
  rines: TIRE_IMAGE,
  'alineación y balanceo': TIRE_IMAGE,
  'alineacion y balanceo': TIRE_IMAGE,
};

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
  @ViewChild('featuredTrack', { static: false }) featuredTrack!: ElementRef;

  productos: Producto[] = [];
  filtered: Producto[] = [];
  featuredProducts: Producto[] = [];
  featuredIndex = 0;
  loading = true;
  error = '';
  purchasing: string | null = null;
  activeCategory = 'Todos';
  categories: string[] = ['Todos'];
  toast = '';
  toastVisible = false;
  private refreshSub: Subscription | null = null;
  private featuredTimer: any = null;

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
        this.buildCategories();
        this.applyFilter();
        this.buildFeatured();
        this.cdr.markForCheck();
      }
    });
  }

  ngOnDestroy() {
    this.refreshSub?.unsubscribe();
    clearInterval(this.featuredTimer);
  }

  private startFeaturedAutoSlide() {
    clearInterval(this.featuredTimer);
    if (this.featuredProducts.length <= 1) return;
    this.featuredTimer = setInterval(() => {
      const next = (this.featuredIndex + 1) % this.featuredProducts.length;
      this.goToSlide(next);
    }, 3500);
  }

  goToSlide(index: number) {
    this.featuredIndex = index;
    const el = this.featuredTrack?.nativeElement;
    if (el) {
      const cardWidth = 280 + 12; // 280px card + 0.75rem gap
      el.scrollTo({ left: index * cardWidth, behavior: 'smooth' });
    }
    this.cdr.markForCheck();
  }

  loadProducts() {
    this.loading = true;
    this.error = '';
    this.api.getFresh<Producto[]>('/products').subscribe({
      next: res => {
        this.productos = res;
        this.buildCategories();
        this.applyFilter();
        this.buildFeatured();
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

  private buildFeatured() {
    this.featuredProducts = this.productos
      .filter(p => p.stock > 0)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 8);
    this.featuredIndex = 0;
    setTimeout(() => this.startFeaturedAutoSlide(), 500);
  }

  filterCategory(cat: string) {
    this.activeCategory = cat;
    this.applyFilter();
  }

  private applyFilter() {
    this.filtered = this.activeCategory === 'Todos'
      ? this.productos
      : this.productos.filter(p => p.categoria === this.activeCategory);
  }

  img(p: Producto) {
    if (p.categoria) {
      const categoryKey = p.categoria.trim().toLowerCase();
      if (CATEGORY_IMAGES[categoryKey]) {
        return CATEGORY_IMAGES[categoryKey];
      }
    }

    const name = (p.nombre || '').trim().toLowerCase();
    const normalizedName = name
      .replace(/á/g, 'a')
      .replace(/é/g, 'e')
      .replace(/í/g, 'i')
      .replace(/ó/g, 'o')
      .replace(/ú/g, 'u')
      .replace(/ñ/g, 'n');
    if (normalizedName.includes('llanta') || normalizedName.includes('neumatico') || normalizedName.includes('rines') || normalizedName.includes('llantas')) {
      return TIRE_IMAGE;
    }

    return productImage(p.icono, p.imagen_url);
  }

  stockClass(stock: number): string {
    if (stock <= 0) return 'out';
    if (stock <= 5) return 'low';
    return '';
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
}
