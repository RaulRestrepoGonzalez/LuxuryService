import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApiService } from 'src/app/core/services/api.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { FALLBACK_SERVICIOS } from 'src/app/shared/constants/servicios.data';

interface HorarioSlot { value: string; label: string; }
const DEFAULT_SLOTS: HorarioSlot[] = [
  { value: '10:00', label: '10:00 a.m.' },
  { value: '14:00', label: '2:00 p.m.' }
];
const CACHE_TTL = 120_000;

@Component({
  selector: 'app-book-appointment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './book-appointment.component.html',
  styleUrl: './book-appointment.component.css'
})
export class BookAppointmentComponent implements OnInit {
  appointmentForm: FormGroup;
  servicios = FALLBACK_SERVICIOS.map(s => ({ id: s.id, nombre: s.nombre, precio_auto: s.precio_auto, precio_camioneta: s.precio_camioneta, precio_base: s.precio_base }));
  tipoVehiculo: 'auto' | 'camioneta' = 'auto';
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

  private bookedCache = new Map<string, Set<string>>();
  private slotCache = new Map<string, HorarioSlot[]>();
  private serviciosFromApi = false;
  private hasPreSelected = false;

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
      horario: ['', Validators.required],
      tipoVehiculo: ['auto', Validators.required]
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
        this.servicios = res;
        this.serviciosFromApi = true;
        if (this.hasPreSelected) this.loadMonthBookings();
      },
      error: () => {}
    });
    this.appointmentForm.get('servicioId')?.valueChanges.subscribe(() => this.onServiceChange());
  }

  onServiceChange() {
    this.appointmentForm.patchValue({ fecha: '', horario: '' });
    this.horarios = [];
    this.payment = null;
    this.successMsg = '';
    this.errorMsg = '';
  }

  private cacheKey(sid: string, y: number, m: number) {
    return `${sid}|${y}|${m}`;
  }

  loadMonthBookings() {
    const sid = this.appointmentForm.get('servicioId')?.value;
    if (!sid || sid.startsWith('fb-')) return;
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
      const disabled = d < today || d.getDay() === 0;
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

  loadSlots(fecha: string) {
    const sid = this.appointmentForm.get('servicioId')?.value;
    if (!sid) return;
    const key = `${sid}|${fecha}`;
    const cached = this.slotCache.get(key);
    if (cached) {
      this.horarios = cached;
      return;
    }

    if (sid.startsWith('fb-')) {
      this.horarios = DEFAULT_SLOTS;
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
    return this.servicios.find(s => s.id === id);
  }

  get precioActual(): number {
    const s = this.selectedService;
    if (!s) return 0;
    return this.tipoVehiculo === 'auto'
      ? (s.precio_auto ?? s.precio_base)
      : (s.precio_camioneta ?? s.precio_base);
  }

  get totalConRecargo(): number {
    return this.precioActual + 10000;
  }

  submit() {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/acceso']);
      return;
    }
    if (this.appointmentForm.invalid) return;
    this.submitting = true;
    this.errorMsg = '';
    this.payment = null;
    const payload = {
      ...this.appointmentForm.value,
      tipoVehiculo: this.tipoVehiculo,
      precio: this.precioActual,
      recargoReserva: 10000,
      total: this.totalConRecargo
    };
    this.api.post<any>('/appointments', payload).subscribe({
      next: res => {
        this.submitting = false;
        this.successMsg = res.message || '¡Cita agendada!';
        this.payment = res.payment || null;
        this.slotCache.clear();
        this.bookedCache.clear();
      },
      error: err => {
        this.submitting = false;
        this.errorMsg = err?.error?.error || 'No se pudo agendar';
      }
    });
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
