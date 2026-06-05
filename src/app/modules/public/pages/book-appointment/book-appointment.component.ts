import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApiService } from 'src/app/core/services/api.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { FALLBACK_SERVICIOS, groupByCategoria, sortByNombreNatural } from 'src/app/shared/constants/servicios.data';
import { resolvedProductImage } from 'src/app/shared/constants/catalog-images';

interface HorarioSlot { value: string; label: string; }
const DEFAULT_SLOTS: HorarioSlot[] = Array.from({ length: 11 }, (_, i) => {
  const h = i + 8;
  const label = h < 12 ? `${h}:00 a.m.` : h === 12 ? `12:00 p.m.` : `${h - 12}:00 p.m.`;
  return { value: `${String(h).padStart(2, '0')}:00`, label };
});

interface ProductoItem {
  id: string; nombre: string; descripcion: string; precio: number; stock: number;
  categoria?: string; icono?: string; imagen_url?: string;
}

@Component({
  selector: 'app-book-appointment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './book-appointment.component.html',
  styleUrl: './book-appointment.component.css'
})
export class BookAppointmentComponent implements OnInit {
  step = 1;
  appointmentForm: FormGroup;
  servicios = FALLBACK_SERVICIOS.map(s => ({ id: s.id, nombre: s.nombre, descripcion: s.descripcion, precio_auto: s.precio_auto, precio_camioneta: s.precio_camioneta, precio_moto: s.precio_moto, precio_base: s.precio_base, categoria: s.categoria, icono: s.icono, imagen_url: s.imagen_url }));
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

  giftCardCode = '';
  giftCardValid: { valid: boolean; monto?: number; etiqueta?: string; error?: string } | null = null;
  validatingGiftCard = false;
  showGiftCardInput = false;

  productos: ProductoItem[] = [];
  selectedProduct: ProductoItem | null = null;
  searchServicio = '';
  searchProducto = '';

  selectedServiceIds: string[] = [];
  collapsedCategories = new Set<string>();
  todayIso = this.toIso(new Date());
  showFullList = false;

  private bookedCache = new Map<string, Set<string>>();
  private serviciosFromApi = false;
  hasPreSelected = false;
  private autoSelectTimer: any = null;
  private retrySlots: string | null = null;

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
    private fb: FormBuilder, private api: ApiService, public auth: AuthService,
    private route: ActivatedRoute, private router: Router
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
    if (tipoParam === 'auto' || tipoParam === 'camioneta' || tipoParam === 'moto') this.tipoVehiculo = tipoParam;
    if (serviciosParam) {
      this.hasPreSelected = true;
      this.selectedServiceIds = serviciosParam.split(',').filter(Boolean);
    } else {
      const pre = this.route.snapshot.queryParamMap.get('servicio');
      if (pre) { this.hasPreSelected = true; this.selectedServiceIds = [pre]; }
    }

    this.resetCollapsed();

    this.api.get<any[]>('/services').subscribe({
      next: (res) => {
        const sorted = sortByNombreNatural(res);
        this.servicios = sorted;
        this.serviciosFromApi = true;
        this.resetCollapsed();
        this.selectedServiceIds = this.selectedServiceIds.map(id => {
          if (id.startsWith('fb-')) {
            const prev = FALLBACK_SERVICIOS.find(s => s.id === id);
            if (!prev) return null;
            const match = sorted.find((s: any) => s.nombre === prev.nombre);
            return match ? match.id : null;
          }
          return sorted.some((s: any) => s.id === id) ? id : null;
        }).filter(Boolean) as string[];
        if (this.selectedServiceIds.length > 0) {
          this.loadMonthBookings();
        }
        if (this.retrySlots && this.appointmentForm.get('fecha')?.value === this.retrySlots) this.loadSlots(this.retrySlots);
        else if (this.selectedServiceIds.length > 0 && this.appointmentForm.get('fecha')?.value) this.loadSlots(this.appointmentForm.get('fecha')!.value);
      },
      error: () => console.error('[Booking] Error cargando servicios')
    });

    this.api.get<ProductoItem[]>('/products').subscribe({
      next: res => this.productos = (res || []).filter(p => p.stock > 0),
      error: () => {}
    });
  }

  toggleCategory(cat: string) {
    if (this.collapsedCategories.has(cat)) this.collapsedCategories.delete(cat);
    else this.collapsedCategories.add(cat);
  }

  private resetCollapsed() {
    const cats = this.serviciosGrouped.categorias;
    this.collapsedCategories = new Set(cats.slice(2));
  }

  toggleService(id: string) {
    const idx = this.selectedServiceIds.indexOf(id);
    if (idx >= 0) this.selectedServiceIds.splice(idx, 1);
    else this.selectedServiceIds.push(id);
    this.selectedServiceIds = [...this.selectedServiceIds];
    this.onServiceChange();
  }

  onServiceChange() {
    this.appointmentForm.patchValue({ fecha: '', horario: '' });
    this.horarios = [];
    this.successMsg = ''; this.errorMsg = '';
    this.selectedProduct = null;
    this.giftCardCode = ''; this.giftCardValid = null;
    this.bookedCache.clear();
    this.resetCollapsed();
    if (this.selectedServiceIds.length > 0) this.loadMonthBookings();
  }

  goStep(n: number) {
    if (n === 2 && this.selectedServiceIds.length === 0) return;
    if (n === 3 && (!this.appointmentForm.get('fecha')?.value || !this.appointmentForm.get('horario')?.value)) return;
    this.errorMsg = '';
    this.step = n;
  }

  private matchSearch(text: string, query: string): boolean {
    const q = query.trim();
    if (!q) return true;
    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '');
    return norm(q).split(/\s+/).filter(Boolean).some(w => norm(text).includes(w));
  }

  get filteredServicios(): any[] {
    return sortByNombreNatural(this.servicios.filter((s: any) => {
      if (s.cotizar_local) return false;
      if (this.tipoVehiculo === 'moto') { if (!/\b(moto(s)?|motocicleta)\b/i.test(s.nombre)) return false; }
      else {
        const precio = this.tipoVehiculo === 'auto' ? (s.precio_auto ?? s.precio_base ?? 0) : (s.precio_camioneta ?? s.precio_base ?? 0);
        if (precio <= 0) return false;
      }
      if (this.usandoGiftCard) {
        const precio = this.tipoVehiculo === 'auto' ? (s.precio_auto ?? s.precio_base ?? 0) : this.tipoVehiculo === 'moto' ? (s.precio_moto ?? s.precio_base ?? 0) : (s.precio_camioneta ?? s.precio_base ?? 0);
        if (precio + 10000 > this.giftCardValid!.monto!) return false;
      }
      return this.matchSearch(s.nombre + ' ' + (s.descripcion || '') + ' ' + (s.categoria || ''), this.searchServicio);
    }));
  }

  get serviciosGrouped(): { categorias: string[]; grouped: Record<string, any[]> } {
    return groupByCategoria(this.filteredServicios as any);
  }

  get filteredProductos(): ProductoItem[] {
    return this.productos.filter(p => this.matchSearch(p.nombre + ' ' + (p.descripcion || '') + ' ' + (p.categoria || ''), this.searchProducto));
  }

  selectProduct(p: ProductoItem) { this.selectedProduct = this.selectedProduct?.id === p.id ? null : p; }

  private resolvedServiceIds(): string[] {
    return this.selectedServiceIds.map(id => this.resolveRealId(id)).filter((id): id is string => !!id && !id.startsWith('fb-'));
  }

  private serviceIdsParam(): string { return this.resolvedServiceIds().join(','); }

  loadMonthBookings() {
    const ids = this.resolvedServiceIds();
    if (ids.length === 0) return;
    const y = this.calendarMonth.getFullYear();
    const m = this.calendarMonth.getMonth() + 1;
    const key = ids.join('_') + '|' + y + '|' + m;
    const cached = this.bookedCache.get(key);
    if (cached) { this.bookedDates = cached; this.buildCalendar(); return; }
    this.loadingCalendar = true;
    this.api.get<{ bookedDates: string[] }>(`/appointments/calendar?servicioId=${this.serviceIdsParam()}&year=${y}&month=${m}`).subscribe({
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
    this.bookedDates = new Set(); this.buildCalendar();
    if (this.serviciosFromApi) this.loadMonthBookings();
  }

  nextMonth() {
    this.calendarMonth = new Date(this.calendarMonth.getFullYear(), this.calendarMonth.getMonth() + 1, 1);
    this.bookedDates = new Set(); this.buildCalendar();
    if (this.serviciosFromApi) this.loadMonthBookings();
  }

  monthLabel() { return this.calendarMonth.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }); }

  buildCalendar() {
    const y = this.calendarMonth.getFullYear();
    const m = this.calendarMonth.getMonth();
    const first = new Date(y, m, 1);
    const start = new Date(first); start.setDate(start.getDate() - start.getDay());
    const today = new Date(); today.setHours(0, 0, 0, 0);
    this.calendarDays = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const iso = this.toIso(d);
      const disabled = d < today || this.bookedDates.has(iso);
      this.calendarDays.push({ date: d, inMonth: d.getMonth() === m, iso, disabled, fullyBooked: this.bookedDates.has(iso) });
    }
  }

  selectDate(iso: string, disabled: boolean) {
    if (disabled) return;
    this.appointmentForm.patchValue({ fecha: iso, horario: '' });
    this.loadSlots(iso);
    this.successMsg = ''; this.errorMsg = '';
  }

  private resolveRealId(fbOrFakeId: string): string | null {
    if (!fbOrFakeId.startsWith('fb-')) return fbOrFakeId;
    const fb = FALLBACK_SERVICIOS.find(s => s.id === fbOrFakeId);
    if (!fb) return null;
    if (!this.serviciosFromApi) return fbOrFakeId;
    const match = this.servicios.find((s: any) => s.nombre === fb.nombre);
    return match ? match.id : fbOrFakeId;
  }

  loadSlots(fecha: string) {
    const ids = this.resolvedServiceIds();
    if (ids.length === 0) {
      const sid = this.selectedServiceIds[0] ? this.resolveRealId(this.selectedServiceIds[0]) : null;
      if (sid && sid.startsWith('fb-') && !this.serviciosFromApi) { this.retrySlots = fecha; this.loadingSlots = true; return; }
      return;
    }
    this.retrySlots = null;
    this.loadingSlots = true;
    this.api.get<HorarioSlot[]>(`/appointments/available?fecha=${fecha}&servicioId=${this.serviceIdsParam()}&_=${Date.now()}`).subscribe({
      next: res => {
        this.horarios = res; this.loadingSlots = false;
        if (res.length === 0) this.errorMsg = 'No hay horarios disponibles para esta fecha. Por favor selecciona otra.';
      },
      error: () => { this.loadingSlots = false; this.errorMsg = 'Error al consultar horarios. Intenta de nuevo.'; }
    });
  }

  selectHorario(h: HorarioSlot) {
    this.appointmentForm.patchValue({ horario: h.value });
    this.successMsg = ''; this.errorMsg = '';
    this.verifySlotStillAvailable(h.value);
  }

  private verifySlotStillAvailable(horario: string) {
    const fecha = this.appointmentForm.get('fecha')?.value;
    if (!fecha) return;
    const ids = this.resolvedServiceIds();
    if (ids.length === 0) return;
    const label = this.horarios.find(h => h.value === horario)?.label || horario;
    this.api.get<HorarioSlot[]>(`/appointments/available?fecha=${fecha}&servicioId=${this.serviceIdsParam()}&_=${Date.now()}`).subscribe({
      next: slots => {
        if (!slots.some(s => s.value === horario)) {
          this.appointmentForm.patchValue({ horario: '' });
          this.errorMsg = `⚠️ El horario de las ${label} ya fue tomado por otro cliente.`;
          this.horarios = slots;
        }
      }
    });
  }

  selectedHorarioLabel(): string {
    const v = this.appointmentForm.get('horario')?.value;
    return this.horarios.find(h => h.value === v)?.label || '';
  }

  isSelectedDate(iso: string) { return this.appointmentForm.get('fecha')?.value === iso; }

  get selectedServices(): any[] {
    if (this.selectedServiceIds.length === 0) return [];
    return this.selectedServiceIds.map(id => {
      const realId = this.resolveRealId(id);
      return this.servicios.find((s: any) => s.id === (realId || id)) || FALLBACK_SERVICIOS.find(s => s.id === id);
    }).filter(Boolean);
  }

  get selectedServiceNames(): string { return this.selectedServices.map((s: any) => s.nombre).join(', '); }

  img(p: ProductoItem) { return resolvedProductImage(p); }

  private generateTicket(): string {
    const prefix = 'LS';
    const ts = Date.now().toString(36).toUpperCase();
    const buf = new Uint8Array(6);
    crypto.getRandomValues(buf);
    const rand = Array.from(buf, b => b.toString(16).padStart(2, '0').toUpperCase()).join('');
    const user = this.auth.getCurrentUser();
    const emailHash = user?.email ? Array.from(user.email).reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0).toString(36).toUpperCase().replace(/-/, 'Z').slice(-3) : '';
    return `${prefix}-${ts}${emailHash}${rand}`;
  }

  submit() {
    if (!this.auth.isLoggedIn()) { this.router.navigate(['/acceso']); return; }
    const user = this.auth.getCurrentUser();
    if (!user || !user.email) { this.errorMsg = 'Debes iniciar sesión con tu correo electrónico para agendar.'; return; }
    if (!this.appointmentForm.get('fecha')?.value || !this.appointmentForm.get('horario')?.value) { this.errorMsg = 'Completa todos los campos.'; return; }
    if (this.selectedServiceIds.length === 0) { this.errorMsg = 'Selecciona al menos un servicio.'; return; }
    this.submitting = true; this.errorMsg = '';

    const fecha = this.appointmentForm.get('fecha')?.value;
    const horarioValue = this.appointmentForm.get('horario')?.value;
    const ids = this.resolvedServiceIds();
    if (ids.length === 0 || !fecha || !horarioValue) { this.errorMsg = 'Error al verificar disponibilidad.'; this.submitting = false; return; }

    this.api.get<HorarioSlot[]>(`/appointments/available?fecha=${fecha}&servicioId=${this.serviceIdsParam()}&_=${Date.now()}`).subscribe({
      next: slots => {
        if (!slots.some(s => s.value === horarioValue)) {
          this.appointmentForm.patchValue({ horario: '' });
          this.errorMsg = '⚠️ El horario seleccionado ya fue tomado.';
          this.horarios = slots; this.submitting = false; return;
        }
        this.sendToWhatsApp();
      },
      error: () => this.sendToWhatsApp()
    });
  }

  private sendToWhatsApp() {
    const user = this.auth.getCurrentUser()!;
    const ticket = this.generateTicket();
    const serviciosList = this.selectedServices.map((s: any) => s.nombre).join(', ');
    const fecha = this.appointmentForm.get('fecha')?.value;
    const horario = this.selectedHorarioLabel();
    const tipoLabel = this.tipoVehiculo === 'auto' ? 'Automóvil' : this.tipoVehiculo === 'camioneta' ? 'Camioneta' : 'Moto';
    const cliente = user.nombre || user.email || 'Cliente';
    const productoTexto = this.selectedProduct ? `\n🛒 *Producto:* ${this.selectedProduct.nombre}` : '';
    const giftCardTexto = this.usandoGiftCard ? `\n🎁 *Gift Card:* ${this.giftCardValid?.etiqueta || ''} (Saldo: ${this.formatPrice(this.giftCardValid?.monto || 0)})` : '';

    const msg = [
      '¡Hola! 🚗 Quiero agendar una cita.', '',
      `🎫 *Ticket:* ${ticket}`, `👤 *Cliente:* ${cliente}`, `📋 *Servicios:* ${serviciosList}`,
      `🚘 *Vehículo:* ${tipoLabel}`, `📅 *Fecha:* ${fecha}`, `⏰ *Horario:* ${horario}${productoTexto}${giftCardTexto}`,
      '', 'Por favor, confirma mi cita. Estaré atento a tu respuesta.',
      '', '🕐 *Horario de atención:* Lun – Sáb 7:00 a.m. – 7:00 p.m., Dom 7:00 a.m. – 2:00 p.m.', '', '¡Gracias! 😊'
    ].join('\n');

    this.successMsg = `🎫 Ticket generado: ${ticket}. Serás redirigido a WhatsApp para confirmar tu cita.`;
    this.submitting = false;
    this.step = 4;
    window.open(`https://wa.me/573006366429?text=${encodeURIComponent(msg)}`, '_blank');
  }

  clearGiftCard() {
    this.giftCardCode = ''; this.giftCardValid = null; this.errorMsg = '';
    this.showGiftCardInput = false; this.selectedServiceIds = [];
    this.horarios = []; this.selectedProduct = null;
  }

  validateGiftCard() {
    const code = this.giftCardCode.trim();
    if (!code) return;
    this.validatingGiftCard = true; this.giftCardValid = null; this.errorMsg = '';
    this.api.get<{ valid: boolean; monto?: number; etiqueta?: string; error?: string }>(`/gift-cards/validate/${encodeURIComponent(code)}`).subscribe({
      next: res => {
        this.validatingGiftCard = false;
        if (res.valid) { this.giftCardValid = { valid: true, monto: res.monto, etiqueta: res.etiqueta }; }
        else { this.giftCardValid = { valid: false, error: res.error || 'Gift Card inválida' }; }
      },
      error: () => { this.validatingGiftCard = false; this.giftCardValid = { valid: false, error: 'Error al validar Gift Card' }; }
    });
  }

  get usandoGiftCard(): boolean { return this.giftCardValid?.valid === true; }

  formatPrice(n: number) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
  }

  private toIso(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
