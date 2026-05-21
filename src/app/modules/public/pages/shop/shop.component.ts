import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
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
export class ShopComponent implements OnInit {
  productos: Producto[] = [];
  filtered: Producto[] = [];
  loading = true;
  purchasing: string | null = null;
  activeCategory = 'Todos';
  categories: string[] = ['Todos'];
  toast = '';
  toastVisible = false;

  constructor(private api: ApiService, public auth: AuthService) {}

  ngOnInit() {
    if (typeof window === 'undefined') return;
    this.loadProducts();
  }

  loadProducts() {
    this.loading = true;
    this.api.get<Producto[]>('/products').subscribe({
      next: res => {
        this.productos = res;
        const cats = [...new Set(res.map(p => p.categoria).filter(Boolean))] as string[];
        this.categories = ['Todos', ...cats];
        this.applyFilter();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
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
