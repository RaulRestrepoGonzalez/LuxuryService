import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService } from 'src/app/core/services/api.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { ActivatedRoute } from '@angular/router';
import { productImage } from 'src/app/shared/constants/catalog-images';

const MOBIL_10W40_IMAGE = 'https://tse4.mm.bing.net/th/id/OIP.fvgaTYLY3V1dELCdTT3GPAHaHa?rs=1&pid=ImgDetMain&o=7&rm=3';
const MOBIL_10W40_GALON_IMAGE = 'https://aldauto.co/wp-content/uploads/2024/07/MO-10W40-SP-GL-1.jpg';
const MOBIL_20W50_IMAGE = 'https://energiteca.vtexassets.com/arquivos/ids/160372/Aceite-Mobil-SUP-1000-20W-50-1-4.png?v=638852833774370000';
const MOBIL_20W50_GALON_IMAGE = 'https://daycar.com.co/wp-content/uploads/2024/01/MOBIL-1000-20W50-SP-GALON-4-LITROS.jpeg';
const MOBIL_ATF_DM_IMAGE = 'https://cdnx.jumpseller.com/comercialharambour/image/65391659/resize/1200/630?1752587427';
const MOBIL_DELVAN_15W40_IMAGE = 'https://ciadelubricantes.com/wp-content/uploads/2024/02/delvac-15w-40-modern.jpg';
const MOBIL_SUPER_2000_10W30_IMAGE = 'https://energiteca.vtexassets.com/arquivos/ids/156496/Aceite-Mobil-SUP-2000-10W30-1-4.png?v=638852833793600000';
const MOBIL_SUPER_2000_10W30_GL_IMAGE = 'https://energiteca.vtexassets.com/arquivos/ids/156497-800-800?v=638852833800300000&width=800&height=800&aspect=true';
const MOBIL_SUPER_3000_5W30_IMAGE = 'https://http2.mlstatic.com/D_NQ_NP_855195-MCO53561034692_022023-O.webp';
const MOBIL_SUPER_3000_5W30_GL_IMAGE = 'https://energiteca.vtexassets.com/arquivos/ids/160379-800-800?v=638852833866000000&width=800&height=800&aspect=true';
const MOBIL_1_0W20_IMAGE = 'https://http2.mlstatic.com/D_Q_NP_694908-MLA99357258250_112025-O.webp';
const WIPER_IMAGE = 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=400&q=75';
const WINDSHIELD_CLEANER_IMAGE = 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&q=75';
const SPARK_PLUG_IMAGE = 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=400&q=75';
const OIL_CAN_IMAGE = 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&q=75';
const FILTER_IMAGE = 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=400&q=75';
const TIRE_IMAGES = [
  'https://www.todosobreautos.com/content/images/2024/11/Tipos-de-Llantas-para-Autos.webp',
];
const CATEGORY_IMAGES: Record<string, string> = {
  llantas: TIRE_IMAGES[0],
  llanta: TIRE_IMAGES[0],
  neumáticos: TIRE_IMAGES[0],
  neumaticos: TIRE_IMAGES[0],
  rines: TIRE_IMAGES[0],
  'alineación y balanceo': TIRE_IMAGES[0],
  'alineacion y balanceo': TIRE_IMAGES[0],
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
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    if (typeof window === 'undefined') return;
    const resolved = this.route.snapshot.data['products'];
    if (Array.isArray(resolved) && resolved.length > 0) {
      this.productos = resolved as Producto[];
      this.buildCategories();
      this.applyFilter();
      this.buildFeatured();
      this.loading = false;
    } else {
      this.loadProducts();
    }
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

  private tireImageForProduct(p: Producto) {
    const text = `${p.categoria || ''} ${p.nombre || ''}`.trim().toLowerCase();
    const normalizedText = text
      .replace(/á/g, 'a')
      .replace(/é/g, 'e')
      .replace(/í/g, 'i')
      .replace(/ó/g, 'o')
      .replace(/ú/g, 'u')
      .replace(/ñ/g, 'n');

    if (normalizedText.includes('llanta') || normalizedText.includes('neumatico') || normalizedText.includes('rines')) {
      const hash = Array.from((p.id || p.nombre || '').toString()).reduce((sum, char) => sum + char.charCodeAt(0), 0);
      return TIRE_IMAGES[hash % TIRE_IMAGES.length];
    }

    return '';
  }

  img(p: Producto) {
    const productName = (p.nombre || '').trim().toLowerCase();
    const cleanProductName = productName.replace(/\s+/g, '').replace(/-/g, '');
    const containsGalon = /galon|gallon|galón/.test(productName);
    if (containsGalon && cleanProductName.startsWith('mobil10w40')) {
      return MOBIL_10W40_GALON_IMAGE;
    }
    if (cleanProductName.startsWith('mobil10w40')) {
      return MOBIL_10W40_IMAGE;
    }
    if (containsGalon && cleanProductName.startsWith('mobil20w50')) {
      return MOBIL_20W50_GALON_IMAGE;
    }
    if (cleanProductName.startsWith('mobil20w50')) {
      return MOBIL_20W50_IMAGE;
    }
    // MOBIL SUPER 2000 10W30 (1/4) and GL variant
    const containsGL = /\bgl\b/.test(productName) || cleanProductName.endsWith('gl');
    if (containsGL && cleanProductName.startsWith('mobilsuper200010w30')) {
      return MOBIL_SUPER_2000_10W30_GL_IMAGE;
    }
    if (cleanProductName.startsWith('mobilsuper200010w30')) {
      return MOBIL_SUPER_2000_10W30_IMAGE;
    }
    // MOBIL SUPER 3000 5W30 (1/4) and GL variant
    if (containsGL && cleanProductName.startsWith('mobilsuper30005w30')) {
      return MOBIL_SUPER_3000_5W30_GL_IMAGE;
    }
    if (cleanProductName.startsWith('mobilsuper30005w30')) {
      return MOBIL_SUPER_3000_5W30_IMAGE;
    }
    // MOBIL-1 0W20 1/4 exact match
    if (cleanProductName.startsWith('mobil10w20')) {
      return MOBIL_1_0W20_IMAGE;
    }
    // MOBIL ATF D/M exact match or variants
    if (cleanProductName.replace(/\./g, '').startsWith('mobilatfdm') || /atf\s*d\/?m/.test(productName)) {
      return MOBIL_ATF_DM_IMAGE;
    }
    // MOBIL DELVAN / DELVAC 15W40 (1/4 and variants)
    if ((/delv(an|ac|van)/.test(productName) || /delvac/.test(productName)) && /15w40/.test(productName)) {
      return MOBIL_DELVAN_15W40_IMAGE;
    }

    const keywordImage = this.keywordImageForProduct(p);
    if (keywordImage) {
      return keywordImage;
    }

    if (p.categoria) {
      const categoryKey = p.categoria.trim().toLowerCase();
      if (CATEGORY_IMAGES[categoryKey]) {
        return CATEGORY_IMAGES[categoryKey];
      }
    }

    const tireImage = this.tireImageForProduct(p);
    if (tireImage) {
      return tireImage;
    }

    return productImage(p.icono, p.imagen_url);
  }

  private keywordImageForProduct(p: Producto) {
    const text = this.normalizeText(`${p.categoria || ''} ${p.nombre || ''}`);
    if (/\b(plumilla|plumillas|beam blade|bean blade|softwiper|titan|wiper)\b/.test(text)) {
      return WIPER_IMAGE;
    }
    if (/\b(limpia|limpiador|limpiaparabrisas|lavaparabrisas|parabrisas|lavaparabrisa)\b/.test(text)) {
      return WINDSHIELD_CLEANER_IMAGE;
    }
    if (/\b(bujia|bujías|bujias)\b/.test(text)) {
      return SPARK_PLUG_IMAGE;
    }
    if (/\b(filtro|filtros)\b/.test(text)) {
      return FILTER_IMAGE;
    }
    if (/\b(aceite|oil|lubricante|lubricantes|motor)\b/.test(text)) {
      return OIL_CAN_IMAGE;
    }
    return '';
  }

  private normalizeText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  private isSupplierDescription(desc: string): boolean {
    const normalized = this.normalizeText(desc);
    if (!normalized) return false;

    const supplierPrefixes = ['proveedor', 'supplier', 'fabricante', 'marca', 'brand'];
    if (supplierPrefixes.some(prefix => normalized.startsWith(prefix + ':') || normalized.startsWith(prefix + ' -') || normalized === prefix)) {
      return true;
    }

    const knownSuppliers = [
      'mobil', 'mobil 1', 'shell', 'castrol', 'repsol', 'petronas', 'mahle', 'bosch', 'ngk', 'denso',
      'pirelli', 'michelin', 'continental', 'goodyear', 'bridgestone', 'cooper', 'firestone', 'hankook',
      'motul', 'valvoline', 'total', 'quaker state', 'elf', 'texaco', 'chevron', 'ac delco', 'mopar',
      'gates', 'trw', 'bosch', 'promo', 'kixx', 'bp', 'royal purple', 'edgard', 'indra', 'yuasa'
    ];

    if (knownSuppliers.some(name => normalized === name || normalized.startsWith(name + ' ') || normalized.endsWith(' ' + name) || normalized.includes(' ' + name + ' '))) {
      return true;
    }

    const words = normalized.split(/\s+/);
    if (words.length <= 3 && normalized.length <= 35) {
      if (/^[A-Z0-9\s&\-()\/]+$/.test(desc) && !/[a-záéíóúñ]/.test(desc)) {
        return true;
      }
    }

    return false;
  }

  productDescription(p: Producto): string {
    const desc = (p.descripcion || '').trim();
    if (!desc || this.isSupplierDescription(desc)) return '';
    return desc.replace(/\s+/g, ' ').trim();
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
