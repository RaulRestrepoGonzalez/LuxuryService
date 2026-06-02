import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApiService } from 'src/app/core/services/api.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { FALLBACK_SERVICIOS, sortByNombreNatural } from 'src/app/shared/constants/servicios.data';
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

  selectedServiceIds: string[] = [];

  private bookedCache = new Map<string, Set<string>>();
  private slotCache = new Map<string, HorarioSlot[]>();
  private serviciosFromApi = false;
  private hasPreSelected = false;
  private resolvingFallback = false;

  private autoSelectTimer: any = null;

  onSearchChange() {
    if (this.autoSelectTimer) clearTimeout(this.autoSelectTimer);
    this.autoSelectTimer = setTimeout(() => {
      const visible = this.filteredServicios;
      const q = this.searchServicio.trim().toLowerCase();
      if (visible.length === 1 && q.length >= 2) {
        const s = visible[0];
        if (!this.selectedServiceIds.includes(s.id)) {
          this.toggleService(s.id);
        }
      }
    }, 400);
  }

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    public auth: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.appointmentForm = this.fb.group({
      fecha: ['', Validators.required],
      horario: ['', Validators.required]
    });
  }

  ngOnInit() {
    if (typeof window === 'undefined') return;
    this.buildCalendar();

    const serviciosParam = this.route.snapshot.queryParamMap.get('servicios');
    const tipoParam = this.route.snapshot.queryParamMap.get('tipo');
    if (tipoParam === 'auto' || tipoParam === 'camioneta' || tipoParam === 'moto') {
      this.tipoVehiculo = tipoParam;
    }
    if (serviciosParam) {
      this.hasPreSelected = true;
      this.selectedServiceIds = serviciosParam.split(',').filter(Boolean);
    } else {
      const pre = this.route.snapshot.queryParamMap.get('servicio');
      if (pre) {
        this.hasPreSelected = true;
        this.selectedServiceIds = [pre];
      }
    }

    this.api.get<any[]>('/services').subscribe({
      next: (res) => {
        const sorted = sortByNombreNatural(res);
        const fecha = this.appointmentForm.get('fecha')?.value;
        this.servicios = sorted;
        this.serviciosFromApi = true;

        this.selectedServiceIds = this.selectedServiceIds
          .map(id => {
            if (id.startsWith('fb-')) {
              const prev = FALLBACK_SERVICIOS.find(s => s.id === id);
              if (!prev) return null;
              const match = sorted.find((s: any) => s.nombre === prev.nombre);
              return match ? match.id : null;
            }
            return sorted.some((s: any) => s.id === id) ? id : null;
          })
          .filter(Boolean) as string[];

        if (this.selectedServiceIds.length > 0) {
          this.loadMonthBookings();
        }
        if (this.retrySlots && this.appointmentForm.get('fecha')?.value === this.retrySlots) {
          this.loadSlots(this.retrySlots);
        } else if (this.selectedServiceIds.length > 0 && this.appointmentForm.get('fecha')?.value) {
          this.loadSlots(this.appointmentForm.get('fecha')!.value);
        }
      },
      error: () => console.error('[Booking] Error cargando servicios')
    });

    this.api.get<ProductoItem[]>('/products').subscribe({
      next: res => this.productos = (res || []).filter(p => p.stock > 0),
      error: () => {}
    });
  }

  toggleService(id: string) {
    const idx = this.selectedServiceIds.indexOf(id);
    if (idx >= 0) {
      this.selectedServiceIds.splice(idx, 1);
    } else {
      this.selectedServiceIds.push(id);
    }
    this.selectedServiceIds = [...this.selectedServiceIds];
    this.onServiceChange();
  }

  onServiceChange() {
    this.appointmentForm.patchValue({ fecha: '', horario: '' });
    this.horarios = [];
    this.payment = null;
    this.successMsg = '';
    this.errorMsg = '';
    this.showProductSelection = false;
    this.selectedProduct = null;
    this.giftCardCode = '';
    this.giftCardValid = null;
    if (this.selectedServiceIds.length > 0) {
      this.loadMonthBookings();
    }
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
    return sortByNombreNatural(this.servicios.filter((s: any) => {
      if (s.cotizar_local) return false;
      if (this.tipoVehiculo === 'moto') {
        if (!/\b(moto(s)?|motocicleta)\b/i.test(s.nombre)) return false;
      } else {
        const precio = this.tipoVehiculo === 'auto'
          ? (s.precio_auto ?? s.precio_base ?? 0)
          : (s.precio_camioneta ?? s.precio_base ?? 0);
        if (precio <= 0) return false;
      }
      if (this.usandoGiftCard) {
        const precio = this.tipoVehiculo === 'auto'
          ? (s.precio_auto ?? s.precio_base ?? 0)
          : this.tipoVehiculo === 'moto'
            ? (s.precio_moto ?? s.precio_base ?? 0)
            : (s.precio_camioneta ?? s.precio_base ?? 0);
        if (precio + 10000 > this.giftCardValid!.monto!) return false;
      }
      return this.matchSearch(s.nombre + ' ' + (s.descripcion || '') + ' ' + (s.categoria || ''), this.searchServicio);
    }));
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
    const sid = this.selectedServiceIds[0] ? this.resolveRealId(this.selectedServiceIds[0]) : null;
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
    const sid = this.selectedServiceIds[0] ? this.resolveRealId(this.selectedServiceIds[0]) : null;
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

  get selectedServices(): any[] {
    if (this.selectedServiceIds.length === 0) return [];
    return this.selectedServiceIds
      .map(id => {
        const realId = this.resolveRealId(id);
        const lookupId = realId || id;
        return this.servicios.find((s: any) => s.id === lookupId) || FALLBACK_SERVICIOS.find(s => s.id === id);
      })
      .filter(Boolean);
  }

  get selectedServiceNames(): string {
    return this.selectedServices.map((s: any) => s.nombre).join(', ');
  }

  get precioServicio(): number {
    return this.selectedServices.reduce((sum: number, s: any) => {
      const p = this.tipoVehiculo === 'auto'
        ? (s.precio_auto ?? s.precio_base ?? 0)
        : this.tipoVehiculo === 'moto'
          ? (s.precio_moto ?? s.precio_base ?? 0)
          : (s.precio_camioneta ?? s.precio_base ?? 0);
      return sum + (p || 0);
    }, 0);
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

  private generateTicket(): string {
    const prefix = 'LS';
    const ts = Date.now().toString(36).toUpperCase().slice(-4);
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${ts}${rand}`;
  }

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
    if (!this.appointmentForm.get('fecha')?.value || !this.appointmentForm.get('horario')?.value) {
      this.errorMsg = 'Completa todos los campos requeridos: servicio, fecha y horario.';
      return;
    }
    if (this.selectedServiceIds.length === 0) {
      this.errorMsg = 'Selecciona al menos un servicio.';
      return;
    }
    this.submitting = true;
    this.errorMsg = '';

    const ticket = this.generateTicket();
    const serviciosList = this.selectedServices.map((s: any) => s.nombre).join(', ');
    const fecha = this.appointmentForm.get('fecha')?.value;
    const horario = this.selectedHorarioLabel();
    const tipoLabel = this.tipoVehiculo === 'auto' ? 'Automóvil' : this.tipoVehiculo === 'camioneta' ? 'Camioneta' : 'Moto';
    const cliente = user.nombre || user.email || 'Cliente';
    const productoTexto = this.selectedProduct
      ? `\n🛒 *Producto:* ${this.selectedProduct.nombre}`
      : '';
    const giftCardTexto = this.usandoGiftCard
      ? `\n🎁 *Gift Card:* ${this.giftCardValid?.etiqueta || ''} (Saldo: ${this.formatPrice(this.giftCardValid?.monto || 0)})`
      : '';

    const msgLines = [
      '¡Hola! 🚗 Quiero agendar una cita.',
      '',
      `🎫 *Ticket:* ${ticket}`,
      `👤 *Cliente:* ${cliente}`,
      `📋 *Servicios:* ${serviciosList}`,
      `🚘 *Vehículo:* ${tipoLabel}`,
      `📅 *Fecha:* ${fecha}`,
      `⏰ *Horario:* ${horario}${productoTexto}${giftCardTexto}`,
      '',
      'Por favor, confirma mi cita. Estaré atento a tu respuesta.',
      '',
      '🕐 *Horario de atención:* Lunes a Sábado de 7:00 a.m. a 7:00 p.m., Domingos de 7:00 a.m. a 2:00 p.m.',
      '',
      '¡Gracias! 😊'
    ];
    const msg = msgLines.join('\n');
    const whatsappUrl = `https://wa.me/573006366429?text=${encodeURIComponent(msg)}`;

    this.successMsg = `🎫 Ticket generado: ${ticket}. Serás redirigido a WhatsApp para confirmar tu cita.`;
    this.submitting = false;
    window.open(whatsappUrl, '_blank');
  }

  clearGiftCard() {
    this.giftCardCode = '';
    this.giftCardValid = null;
    this.errorMsg = '';
    this.showGiftCardInput = false;
    this.selectedServiceIds = [];
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
          this.selectedServiceIds = [];
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
