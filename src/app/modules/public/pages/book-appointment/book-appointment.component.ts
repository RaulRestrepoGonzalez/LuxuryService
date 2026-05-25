import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApiService } from 'src/app/core/services/api.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { FALLBACK_SERVICIOS } from 'src/app/shared/constants/servicios.data';
import { productImage } from 'src/app/shared/constants/catalog-images';

interface HorarioSlot { value: string; label: string; }
const DEFAULT_SLOTS: HorarioSlot[] = [
  { value: '10:00', label: '10:00 a.m.' },
  { value: '14:00', label: '2:00 p.m.' }
];

interface ProductoItem {
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
  selector: 'app-book-appointment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './book-appointment.component.html',
  styleUrl: './book-appointment.component.css'
})
export class BookAppointmentComponent implements OnInit {
  appointmentForm: FormGroup;
  servicios = FALLBACK_SERVICIOS.map(s => ({ id: s.id, nombre: s.nombre, precio_auto: s.precio_auto, precio_camioneta: s.precio_camioneta, precio_moto: s.precio_moto, precio_base: s.precio_base }));
  tipoVehiculo: 'auto' | 'camioneta' | 'moto' = 'auto';
  horarios: HorarioSlot[] = [];
  loadingSlots = false;
  submitting = false;
  successMsg = '';
  errorMsg = '';

  calendarMonth: Date = new Date();
  weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  calendarDays: { date: Date; inMonth: boolean; iso: string; disabled: boolean; fullyBooked: boolean }[] = [];
  loadingCalendar = false;

  payment: { url: string; reference: string; amount: number; qr: string } | null = null;

  giftCardCode = '';
  giftCardValid: { valid: boolean; monto?: number; etiqueta?: string; error?: string } | null = null;
  validatingGiftCard = false;
  showGiftCardInput = false;

  productos: ProductoItem[] = [];
  showProductSelection = false;
  selectedProduct: ProductoItem | null = null;
  searchServicio = '';
  searchProducto = '';

  private bookedCache = new Map<string, Set<string>>();
  private slotCache = new Map<string, HorarioSlot[]>();
  private serviciosFromApi = false;
  private hasPreSelected = false;
  private resolvingFallback = false;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    public auth: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.appointmentForm = this.fb.group({
      servicioId: ['', Validators.required],
      fecha: ['', Validators.required],
      horario: ['', Validators.required]
    });
  }

  ngOnInit() {
    if (typeof window === 'undefined') return;
    this.buildCalendar();

    const pre = this.route.snapshot.queryParamMap.get('servicio');
    if (pre) {
      this.hasPreSelected = true;
      this.appointmentForm.patchValue({ servicioId: pre });
    }

    this.api.get('/services').subscribe({
      next: (res: any) => {
        const prevId = this.appointmentForm.get('servicioId')?.value;
        const fecha = this.appointmentForm.get('fecha')?.value;
        this.servicios = res;
        this.serviciosFromApi = true;
        if (prevId) {
          if (prevId.startsWith('fb-')) {
            const prev = FALLBACK_SERVICIOS.find(s => s.id === prevId);
            if (prev) {
              const match = res.find((s: any) => s.nombre === prev.nombre);
              if (match) {
                this.resolvingFallback = true;
                this.appointmentForm.patchValue({ servicioId: match.id });
                this.resolvingFallback = false;
              }
            }
          } else {
            const stillExists = res.some((s: any) => s.id === prevId);
            if (!stillExists) this.appointmentForm.patchValue({ servicioId: '' });
          }
        }
        if (this.retrySlots && this.appointmentForm.get('fecha')?.value === this.retrySlots) {
          this.loadSlots(this.retrySlots);
        } else if (this.appointmentForm.get('servicioId')?.value && this.appointmentForm.get('fecha')?.value) {
          this.loadSlots(this.appointmentForm.get('fecha')!.value);
        } else if (this.appointmentForm.get('servicioId')?.value) {
          this.loadMonthBookings();
        }
      },
      error: () => console.error('[Booking] Error cargando servicios')
    });
    this.appointmentForm.get('servicioId')?.valueChanges.subscribe(() => this.onServiceChange());

    this.api.get<ProductoItem[]>('/products').subscribe({
      next: res => this.productos = res.filter(p => p.stock > 0),
      error: () => {}
    });
  }

  onServiceChange() {
    if (!this.resolvingFallback) {
      this.appointmentForm.patchValue({ fecha: '', horario: '' });
      this.horarios = [];
      this.payment = null;
      this.successMsg = '';
      this.errorMsg = '';
      this.showProductSelection = false;
      this.selectedProduct = null;
      this.giftCardCode = '';
      this.giftCardValid = null;
    }
    this.loadMonthBookings();
  }

  private matchSearch(text: string, query: string): boolean {
    const q = query.trim();
    if (!q) return true;
    const norm = (s: string) =>
      s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '');
    const words = norm(q).split(/\s+/).filter(w => w.length > 0);
    const haystack = norm(text);
    return words.some(w => w.length >= 1 && haystack.includes(w));
  }

  get filteredServicios(): any[] {
    return this.servicios.filter((s: any) => {
      if (s.cotizar_local) return false;
      if (this.tipoVehiculo === 'moto' && (s.precio_moto == null || s.precio_moto <= 0)) return false;
      if (this.usandoGiftCard) {
        const precio = this.tipoVehiculo === 'auto'
          ? (s.precio_auto ?? s.precio_base ?? 0)
          : this.tipoVehiculo === 'moto'
            ? (s.precio_moto ?? s.precio_base ?? 0)
            : (s.precio_camioneta ?? s.precio_base ?? 0);
        if (precio + 10000 > this.giftCardValid!.monto!) return false;
      }
      return this.matchSearch(s.nombre + ' ' + (s.descripcion || '') + ' ' + (s.categoria || ''), this.searchServicio);
    });
  }

  get filteredProductos(): ProductoItem[] {
    return this.productos.filter(p =>
      this.matchSearch(p.nombre + ' ' + (p.descripcion || '') + ' ' + (p.categoria || ''), this.searchProducto)
    );
  }

  toggleProductSelection(show: boolean) {
    this.showProductSelection = show;
    if (!show) this.selectedProduct = null;
  }

  selectProduct(p: ProductoItem) {
    this.selectedProduct = this.selectedProduct?.id === p.id ? null : p;
  }

  private cacheKey(sid: string, y: number, m: number) {
    return `${sid}|${y}|${m}`;
  }

  loadMonthBookings() {
    const sid = this.resolveRealId(this.appointmentForm.get('servicioId')?.value || '');
    if (!sid) return;
    const y = this.calendarMonth.getFullYear();
    const m = this.calendarMonth.getMonth() + 1;
    const key = this.cacheKey(sid, y, m);
    const cached = this.bookedCache.get(key);
    if (cached) {
      this.bookedDates = cached;
      this.buildCalendar();
      return;
    }
    this.loadingCalendar = true;
    this.api.get<{ bookedDates: string[] }>(`/appointments/calendar?servicioId=${sid}&year=${y}&month=${m}`).subscribe({
      next: res => {
        const s = new Set(res.bookedDates);
        this.bookedCache.set(key, s);
        this.bookedDates = s;
        this.loadingCalendar = false;
        this.buildCalendar();
      },
      error: () => { this.loadingCalendar = false; }
    });
  }

  bookedDates = new Set<string>();

  prevMonth() {
    this.calendarMonth = new Date(this.calendarMonth.getFullYear(), this.calendarMonth.getMonth() - 1, 1);
    this.bookedDates = new Set();
    this.buildCalendar();
    if (this.appointmentForm.get('servicioId')?.value && this.serviciosFromApi) this.loadMonthBookings();
  }

  nextMonth() {
    this.calendarMonth = new Date(this.calendarMonth.getFullYear(), this.calendarMonth.getMonth() + 1, 1);
    this.bookedDates = new Set();
    this.buildCalendar();
    if (this.appointmentForm.get('servicioId')?.value && this.serviciosFromApi) this.loadMonthBookings();
  }

  monthLabel() {
    return this.calendarMonth.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  }

  buildCalendar() {
    const y = this.calendarMonth.getFullYear();
    const m = this.calendarMonth.getMonth();
    const first = new Date(y, m, 1);
    const start = new Date(first);
    start.setDate(start.getDate() - start.getDay());
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this.calendarDays = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const iso = this.toIso(d);
      const disabled = d < today || d.getDay() === 0 || this.bookedDates.has(iso);
      this.calendarDays.push({
        date: d,
        inMonth: d.getMonth() === m,
        iso,
        disabled,
        fullyBooked: this.bookedDates.has(iso)
      });
    }
  }

  selectDate(iso: string, disabled: boolean) {
    if (disabled) return;
    this.appointmentForm.patchValue({ fecha: iso, horario: '' });
    this.loadSlots(iso);
    this.payment = null;
    this.successMsg = '';
    this.errorMsg = '';
  }

  private resolveRealId(fbOrFakeId: string): string | null {
    if (!fbOrFakeId.startsWith('fb-')) return fbOrFakeId;
    const fb = FALLBACK_SERVICIOS.find(s => s.id === fbOrFakeId);
    if (!fb) return null;
    if (!this.serviciosFromApi) return fbOrFakeId;
    const match = this.servicios.find((s: any) => s.nombre === fb.nombre);
    return match ? match.id : fbOrFakeId;
  }

  private retrySlots: string | null = null;

  loadSlots(fecha: string) {
    const sid = this.resolveRealId(this.appointmentForm.get('servicioId')?.value || '');
    if (!sid) return;
    if (sid.startsWith('fb-') && !this.serviciosFromApi) {
      this.retrySlots = fecha;
      this.loadingSlots = true;
      return;
    }
    this.retrySlots = null;
    const key = `${sid}|${fecha}`;
    const cached = this.slotCache.get(key);
    if (cached) {
      this.horarios = cached;
      return;
    }

    this.loadingSlots = true;
    this.api.get<HorarioSlot[]>(`/appointments/available?fecha=${fecha}&servicioId=${sid}`).subscribe({
      next: res => {
        this.slotCache.set(key, res);
        this.horarios = res;
        this.loadingSlots = false;
      },
      error: () => {
        this.loadingSlots = false;
        this.horarios = DEFAULT_SLOTS;
      }
    });
  }

  selectHorario(h: HorarioSlot) {
    this.appointmentForm.patchValue({ horario: h.value });
    this.payment = null;
    this.successMsg = '';
    this.errorMsg = '';
  }

  selectedHorarioLabel(): string {
    const v = this.appointmentForm.get('horario')?.value;
    return this.horarios.find(h => h.value === v)?.label || '';
  }

  isSelectedDate(iso: string) {
    return this.appointmentForm.get('fecha')?.value === iso;
  }

  get selectedService(): any {
    const id = this.appointmentForm.get('servicioId')?.value;
    if (!id) return null;
    const realId = this.resolveRealId(id);
    const lookupId = realId || id;
    return this.servicios.find((s: any) => s.id === lookupId) || FALLBACK_SERVICIOS.find(s => s.id === id);
  }

  get precioServicio(): number {
    const s = this.selectedService;
    if (!s) return 0;
    return this.tipoVehiculo === 'auto'
      ? (s.precio_auto ?? s.precio_base)
      : this.tipoVehiculo === 'moto' ? (s.precio_moto ?? s.precio_base) : (s.precio_camioneta ?? s.precio_base);
  }

  get precioProducto(): number {
    return this.selectedProduct?.precio ?? 0;
  }

  get precioActual(): number {
    return this.precioServicio + this.precioProducto;
  }

  get totalConRecargo(): number {
    return this.precioActual + 10000;
  }

  img(p: ProductoItem) { return productImage(p.icono, p.imagen_url); }

  submit() {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/acceso']);
      return;
    }
    const user = this.auth.getCurrentUser();
    if (!user || !user.email) {
      this.errorMsg = 'Debes iniciar sesión con tu correo electrónico para agendar.';
      return;
    }
    if (this.appointmentForm.invalid) {
      this.errorMsg = 'Completa todos los campos requeridos: servicio, fecha y horario.';
      return;
    }
    this.submitting = true;
    this.errorMsg = '';
    this.payment = null;
    let servicioId = this.appointmentForm.get('servicioId')?.value || '';
    if (servicioId.startsWith('fb-')) {
      const realId = this.resolveRealId(servicioId);
      if (realId) servicioId = realId;
    }
    if (this.usandoGiftCard && this.totalConRecargo > this.giftCardValid!.monto!) {
      this.errorMsg = `El total (${this.formatPrice(this.totalConRecargo)}) excede el saldo de la Gift Card (${this.formatPrice(this.giftCardValid!.monto!)}). Elige un servicio más económico o sin productos adicionales.`;
      this.submitting = false;
      return;
    }

    const payload: Record<string, any> = {
      servicioId,
      fecha: this.appointmentForm.get('fecha')?.value,
      horario: this.appointmentForm.get('horario')?.value,
      tipoVehiculo: this.tipoVehiculo,
      precio: this.precioServicio,
      productoPrecio: this.precioProducto,
      recargoReserva: 10000,
      total: this.totalConRecargo
    };
    if (this.usandoGiftCard) {
      payload['giftCardCode'] = this.giftCardCode.trim();
    }
    if (this.selectedProduct) {
      payload['productoId'] = this.selectedProduct.id;
      payload['productoNombre'] = this.selectedProduct.nombre;
    }
    this.api.post<any>('/appointments', payload).subscribe({
      next: res => {
        this.submitting = false;
        if (res.cita) {
          this.successMsg = res.message || '¡Cita confirmada con Gift Card!';
          this.appointmentForm.reset();
          this.selectedProduct = null;
          this.showProductSelection = false;
          this.giftCardCode = '';
          this.giftCardValid = null;
          this.horarios = [];
        } else {
          this.successMsg = res.message || '¡Cita agendada!';
          this.payment = res.payment || null;
          this.slotCache.clear();
          this.bookedCache.clear();
          if (this.payment?.url) {
            window.location.href = this.payment.url;
          }
        }
      },
      error: err => {
        this.submitting = false;
        this.errorMsg = err?.error?.error || 'No se pudo agendar';
      }
    });
  }

  clearGiftCard() {
    this.giftCardCode = '';
    this.giftCardValid = null;
    this.errorMsg = '';
    this.showGiftCardInput = false;
    this.appointmentForm.patchValue({ servicioId: '' });
    this.horarios = [];
    this.selectedProduct = null;
    this.showProductSelection = false;
  }

  validateGiftCard() {
    const code = this.giftCardCode.trim();
    if (!code) return;
    this.validatingGiftCard = true;
    this.giftCardValid = null;
    this.errorMsg = '';
    this.api.get<{ valid: boolean; monto?: number; etiqueta?: string; error?: string }>(`/gift-cards/validate/${encodeURIComponent(code)}`).subscribe({
      next: res => {
        this.validatingGiftCard = false;
        if (res.valid) {
          this.giftCardValid = { valid: true, monto: res.monto, etiqueta: res.etiqueta };
          this.appointmentForm.patchValue({ servicioId: '' });
          this.horarios = [];
          this.selectedProduct = null;
          this.showProductSelection = false;
        } else {
          this.giftCardValid = { valid: false, error: res.error || 'Gift Card inválida' };
        }
      },
      error: () => {
        this.validatingGiftCard = false;
        this.giftCardValid = { valid: false, error: 'Error al validar Gift Card' };
      }
    });
  }

  get usandoGiftCard(): boolean {
    return this.giftCardValid?.valid === true;
  }

  payAgain() {
    if (this.payment) window.open(this.payment.url, '_blank');
  }

  formatPrice(n: number) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
  }

  private toIso(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
