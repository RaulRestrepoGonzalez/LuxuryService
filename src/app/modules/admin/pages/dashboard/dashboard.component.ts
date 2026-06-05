import { Component, OnInit, OnDestroy, AfterViewInit, ViewChildren, QueryList, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from 'src/app/core/services/api.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const CHART_COLORS = {
  green: ['rgba(34,197,94,0.7)', 'rgba(34,197,94,0.12)', '#22c55e'],
  red: ['rgba(239,68,68,0.6)', 'rgba(239,68,68,0.08)', '#ef4444'],
  blue: ['rgba(59,130,246,0.6)', 'rgba(59,130,246,0.1)', '#3b82f6'],
  purple: ['rgba(168,85,247,0.6)', 'rgba(168,85,247,0.07)', '#a855f7'],
  yellow: ['rgba(234,179,8,0.6)', 'rgba(234,179,8,0.1)', '#eab308'],
};

const STATUS_COLORS: Record<string, string> = {
  pendiente: '#eab308', pendiente_pago: '#f97316', confirmada: '#22c55e', completada: '#3b82f6', cancelada: '#ef4444'
};

const STATUS_LABELS: Record<string, string> = {
  pendiente_pago: 'Pendiente pago', pendiente: 'Pendiente', confirmada: 'Confirmada', completada: 'Completada', cancelada: 'Cancelada'
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  styles: [`
    :host { display: block; padding: 1.5rem 0; }
    .admin-nav { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
    .admin-nav a { padding: 0.5rem 1.1rem; border-radius: 999px; font-size: 0.8rem; font-weight: 700; text-decoration: none; color: #555; background: #fff; transition: background .2s, color .2s; border: 1px solid #ddd; }
    .admin-nav a:hover { background: #f5f5f5; color: #0a0a0a; border-color: #bbb; }
    .admin-nav a.active { background: #ff2b2b; color: #fff; border-color: #ff2b2b; }

    .dash-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem; }
    .dash-header h2 { margin: 0; font-size: 1.5rem; color: #111827; font-weight: 800; }
    .dash-sub { margin: 0.2rem 0 0; font-size: 0.85rem; color: #6b7280; }

    .dash-content { background: #f3f4f6; border-radius: 16px; padding: 2rem; }

    .filters-bar { display: flex; gap: 0.5rem; margin-bottom: 1.75rem; flex-wrap: wrap; align-items: center; }
    .filters-bar label { font-size: 0.78rem; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.03em; margin-right: 0.25rem; }
    .filter-btn { padding: 0.4rem 0.9rem; border-radius: 8px; font-size: 0.78rem; font-weight: 600; cursor: pointer; border: 1px solid #d1d5db; background: #fff; color: #374151; transition: all .15s; }
    .filter-btn:hover { border-color: #9ca3af; background: #f9fafb; }
    .filter-btn.active { background: #111827; color: #fff; border-color: #111827; }

    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1.25rem; margin-bottom: 2rem; }
    .kpi-card { background: #fff; border-radius: 12px; padding: 1.35rem 1.35rem 1.1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.06); transition: box-shadow .2s; }
    .kpi-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    .kpi-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem; }
    .kpi-icon { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.05rem; }
    .kpi-trend { font-size: 0.7rem; font-weight: 700; padding: 0.2rem 0.5rem; border-radius: 6px; white-space: nowrap; }
    .kpi-trend.up { background: rgba(34,197,94,0.12); color: #16a34a; }
    .kpi-trend.down { background: rgba(239,68,68,0.12); color: #dc2626; }
    .kpi-label { margin: 0; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.04em; color: #6b7280; font-weight: 600; }
    .kpi-value { margin: 0.2rem 0 0; font-size: 1.5rem; font-weight: 800; color: #111827; line-height: 1.2; }
    .kpi-sub { margin: 0.15rem 0 0; font-size: 0.72rem; color: #9ca3af; }

    .chart-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.25rem; margin-bottom: 2rem; }
    .chart-card { background: #fff; border-radius: 14px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.06); transition: box-shadow .2s, transform .15s; cursor: default; }
    .chart-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,0.1); transform: translateY(-2px); }
    .chart-card.full-width { grid-column: 1 / -1; }
    .chart-card h3 { margin: 0 0 0.05rem; font-size: 0.9rem; color: #111827; font-weight: 700; }
    .chart-hint { margin: 0 0 0.6rem; font-size: 0.7rem; color: #9ca3af; }
    .chart-wrap { position: relative; width: 100%; min-height: 220px; }
    .chart-wrap canvas { width: 100% !important; height: 100% !important; min-height: 220px; display: block; }

    .table-card { background: #fff; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.06); margin-bottom: 1.25rem; }
    .table-card h3 { margin: 0 0 0.05rem; font-size: 0.9rem; color: #111827; font-weight: 700; }
    .table-scroll { overflow-x: auto; margin-top: 0.75rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
    th { text-align: left; padding: 0.65rem 0.75rem; color: #6b7280; font-weight: 600; text-transform: uppercase; font-size: 0.68rem; letter-spacing: 0.04em; border-bottom: 1px solid #e5e7eb; white-space: nowrap; }
    td { padding: 0.65rem 0.75rem; color: #374151; border-bottom: 1px solid #f3f4f6; white-space: nowrap; }
    tbody tr:hover { background: #f9fafb; }
    td:first-child, th:first-child { padding-left: 0; }
    td:last-child, th:last-child { padding-right: 0; }
    .text-right { text-align: right; }
    .stock-badge { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; background: #f3f4f6; color: #374151; }
    .stock-badge.low { background: rgba(239,68,68,0.1); color: #dc2626; }
    .stock-badge.ok { background: rgba(34,197,94,0.1); color: #16a34a; }
    .status-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 0.5rem; vertical-align: middle; }

    .export-section { margin-top: 2rem; }
    .export-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.25rem; }
    .export-card { background: #fff; border-radius: 14px; padding: 1.25rem 1.25rem 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.06); transition: box-shadow .2s, transform .15s; display: flex; flex-direction: column; }
    .export-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,0.1); transform: translateY(-2px); }
    .export-icon { font-size: 2rem; margin-bottom: 0.5rem; }
    .export-body { flex: 1; }
    .export-body h4 { margin: 0 0 0.3rem; font-size: 1rem; color: #111827; font-weight: 700; }
    .export-body p { margin: 0 0 0.6rem; font-size: 0.78rem; color: #6b7280; line-height: 1.5; }
    .export-files { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-bottom: 0.8rem; }
    .export-files span { font-size: 0.65rem; background: #f3f4f6; color: #374151; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 600; }
    .export-btn { width: 100%; padding: 0.55rem; border-radius: 8px; font-size: 0.82rem; font-weight: 700; cursor: pointer; border: none; transition: all .2s; text-align: center; }
    .export-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none !important; }
    .csv-btn { background: #111827; color: #fff; }
    .csv-btn:hover:not(:disabled) { background: #1f2937; transform: translateY(-1px); }
    .pbi-btn { background: #f2c811; color: #000; }
    .pbi-btn:hover:not(:disabled) { background: #e0b800; transform: translateY(-1px); }

    .section-title { font-size: 0.78rem; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em; margin: 0 0 1rem; }

    .empty-state { text-align: center; padding: 2.5rem 1rem; color: #9ca3af; font-size: 0.85rem; }



    @media (max-width: 800px) {
      .chart-grid { grid-template-columns: 1fr; gap: 1rem; }
      .export-grid { grid-template-columns: 1fr; gap: 1rem; }
      .kpi-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 1rem; }
      .dash-header { flex-direction: column; align-items: flex-start; }
      .dash-content { padding: 1rem; }
      .chart-wrap { min-height: 250px; }
      .chart-wrap canvas { min-height: 250px; }
    }
  `],
  template: `
    <nav class="admin-nav">
      <a routerLink="/admin/dashboard" routerLinkActive="active">Dashboard</a>
      <a routerLink="/admin/citas" routerLinkActive="active">Citas</a>
      <a routerLink="/admin/inventario" routerLinkActive="active">Inventario</a>
      <a routerLink="/admin/importar" routerLinkActive="active">Importar</a>
      <a routerLink="/admin/email-settings" routerLinkActive="active">Email</a>
    </nav>

    <div class="dash-header">
      <div>
        <h2>Dashboard ejecutivo</h2>
        <p class="dash-sub">Métricas clave para la toma de decisiones</p>
      </div>
    </div>

    <div class="dash-content">
      <div class="filters-bar">
        <label>Período:</label>
        <button class="filter-btn" [class.active]="filterRange === 3" (click)="setFilter(3)">3 meses</button>
        <button class="filter-btn" [class.active]="filterRange === 6" (click)="setFilter(6)">6 meses</button>
        <button class="filter-btn" [class.active]="filterRange === 12" (click)="setFilter(12)">12 meses</button>
        <button class="filter-btn" [class.active]="filterRange === 0" (click)="setFilter(0)">Todo</button>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-icon" style="background:rgba(34,197,94,0.12);color:#16a34a;">$</span>
            <span class="kpi-trend up">{{ trendIngresos }}</span>
          </div>
          <p class="kpi-label">Ingresos totales</p>
          <p class="kpi-value">{{ ingresos | currency:'USD':'symbol':'1.0-0' }}</p>
          <p class="kpi-sub">Margen: {{ margen }}% sobre el total</p>
        </div>
        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-icon" style="background:rgba(239,68,68,0.12);color:#dc2626;">↑</span>
            <span class="kpi-trend down">{{ trendEgresos }}</span>
          </div>
          <p class="kpi-label">Egresos totales</p>
          <p class="kpi-value">{{ egresos | currency:'USD':'symbol':'1.0-0' }}</p>
          <p class="kpi-sub">{{ (ingresos / (egresos || 1)).toFixed(1) }}x ingreso/egreso</p>
        </div>
        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-icon" style="background:rgba(59,130,246,0.12);color:#2563eb;">👤</span>
          </div>
          <p class="kpi-label">Clientes registrados</p>
          <p class="kpi-value">{{ stats.totalClients }}</p>
          <p class="kpi-sub">Nuevos este mes: {{ newClientsThisMonth }}</p>
        </div>
        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-icon" style="background:rgba(168,85,247,0.12);color:#9333ea;">📅</span>
          </div>
          <p class="kpi-label">Citas totales</p>
          <p class="kpi-value">{{ stats.totalAppointments }}</p>
          <p class="kpi-sub">Tasa completadas: {{ completionRate }}%</p>
        </div>
        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-icon" style="background:rgba(249,115,22,0.12);color:#ea580c;">🛠️</span>
          </div>
          <p class="kpi-label">Servicios activos</p>
          <p class="kpi-value">{{ stats.totalServices }}</p>
          <p class="kpi-sub">{{ bookedServicesCount }} con reservas</p>
        </div>
        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-icon" style="background:rgba(234,179,8,0.12);color:#ca8a04;">📦</span>
          </div>
          <p class="kpi-label">Productos</p>
          <p class="kpi-value">{{ productStats.length }}</p>
          <p class="kpi-sub">{{ lowStockCount }} con stock bajo</p>
        </div>
      </div>

      <div class="chart-grid">
        <div class="chart-card full-width">
          <h3>Evolución mensual: Ingresos vs Egresos</h3>
          <p class="chart-hint">Rentabilidad mes a mes &middot; Click en leyenda para ocultar/mostrar</p>
          <div class="chart-wrap"><canvas #revCanvas></canvas></div>
        </div>
        <div class="chart-card">
          <h3>Citas por estado</h3>
          <p class="chart-hint">Distribución actual &middot; Click para filtrar</p>
          <div class="chart-wrap"><canvas #statusCanvas></canvas></div>
        </div>
        <div class="chart-card">
          <h3>Servicios más reservados</h3>
          <p class="chart-hint">Top 8 servicios con más citas</p>
          <div class="chart-wrap"><canvas #servicesCanvas></canvas></div>
        </div>
        <div class="chart-card">
          <h3>Crecimiento de clientes</h3>
          <p class="chart-hint">Nuevos registros por mes</p>
          <div class="chart-wrap"><canvas #clientsCanvas></canvas></div>
        </div>
        <div class="chart-card">
          <h3>Citas por mes</h3>
          <p class="chart-hint">Volumen de citas agendadas</p>
          <div class="chart-wrap"><canvas #citasCanvas></canvas></div>
        </div>
        <div class="chart-card">
          <h3>Productos: stock crítico</h3>
          <p class="chart-hint">Productos con stock &lt; 10 unidades</p>
          <div class="chart-wrap"><canvas #stockCanvas></canvas></div>
        </div>
      </div>

      @if (productStats.length > 0) {
        <div class="table-card">
          <h3>Rendimiento de productos</h3>
          <p class="chart-hint">Ventas, ingresos y stock por producto</p>
          <div class="table-scroll">
            <table>
              <thead><tr><th>Producto</th><th>Categoría</th><th class="text-right">Ventas</th><th class="text-right">Ingresos</th><th class="text-right">Stock</th></tr></thead>
              <tbody>
                @for (p of productStats; track p.id) {
                  <tr>
                    <td>{{ p.nombre }}</td>
                    <td>{{ p.categoria || 'General' }}</td>
                    <td class="text-right">{{ p.ventas }}</td>
                    <td class="text-right">{{ p.ingresos | currency:'USD':'symbol':'1.0-0' }}</td>
                    <td class="text-right"><span class="stock-badge" [class.low]="p.stock < 10" [class.ok]="p.stock >= 10">{{ p.stock }}</span></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      @if (analytics.appointmentsByStatus?.length) {
        <div class="table-card">
          <h3>Resumen de citas</h3>
          <p class="chart-hint">Cantidad de citas agrupadas por estado</p>
          <div class="table-scroll">
            <table>
              <thead><tr><th>Estado</th><th class="text-right">Cantidad</th></tr></thead>
              <tbody>
                @for (s of analytics.appointmentsByStatus; track s._id) {
                  <tr>
                    <td><span class="status-dot" [style.background]="STATUS_COLORS[s._id] || '#9ca3af'"></span>{{ STATUS_LABELS[s._id] || s._id }}</td>
                    <td class="text-right"><strong>{{ s.count }}</strong></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <div class="export-section">
        <p class="section-title">Exportar datos</p>
        <div class="export-grid">
          <div class="export-card">
            <div class="export-icon">📄</div>
            <div class="export-body">
              <h4>CSV unificado</h4>
              <p>Un solo archivo CSV con todas las tablas (transacciones, citas, usuarios, productos, servicios). Listo para Excel, Google Sheets o Power BI Online.</p>
              <div class="export-files">
                <span>Tabla (discriminador)</span><span>Transacciones</span><span>Citas</span><span>Usuarios</span><span>Productos</span><span>Servicios</span>
              </div>
            </div>
            <button class="export-btn csv-btn" (click)="exportCsv()" [disabled]="exporting">
              @if (exporting === 'csv') { Generando… } @else { Descargar CSV }
            </button>
          </div>
          <div class="export-card">
            <div class="export-icon">📊</div>
            <div class="export-body">
              <h4>Power BI (PBIX)</h4>
              <p>Archivo nativo de Power BI con datos incrustados. Ábrelo directamente en Power BI Desktop para visualizar y explorar.</p>
              <div class="export-files">
                <span>Transacciones</span><span>Citas</span><span>Usuarios</span><span>Productos</span><span>Servicios</span>
              </div>
            </div>
            <button class="export-btn pbi-btn" (click)="exportPowerBi()" [disabled]="exporting">
              @if (exporting === 'powerbi') { Generando… } @else { Descargar PBIX }
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChildren('revCanvas') revCanvas!: QueryList<ElementRef<HTMLCanvasElement>>;
  @ViewChildren('statusCanvas') statusCanvas!: QueryList<ElementRef<HTMLCanvasElement>>;
  @ViewChildren('servicesCanvas') servicesCanvas!: QueryList<ElementRef<HTMLCanvasElement>>;
  @ViewChildren('clientsCanvas') clientsCanvas!: QueryList<ElementRef<HTMLCanvasElement>>;
  @ViewChildren('citasCanvas') citasCanvas!: QueryList<ElementRef<HTMLCanvasElement>>;
  @ViewChildren('stockCanvas') stockCanvas!: QueryList<ElementRef<HTMLCanvasElement>>;

  ingresos = 0;
  egresos = 0;
  stats: any = { totalClients: 0, totalAppointments: 0, totalServices: 0 };
  analytics: any = {};
  productStats: any[] = [];
  filterRange = 6;
  exporting: 'csv' | 'powerbi' | null = null;

  protected readonly STATUS_LABELS = STATUS_LABELS;
  protected readonly STATUS_COLORS = STATUS_COLORS;

  private charts: any[] = [];
  private analyticsRaw: any = {};

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  get margen(): string {
    const total = this.ingresos + this.egresos;
    if (total === 0) return '0';
    return ((this.ingresos - this.egresos) / total * 100).toFixed(1);
  }

  get trendIngresos(): string {
    return this.calcTrend(this.filteredRevenue(), 'ingresos');
  }

  get trendEgresos(): string {
    return this.calcTrend(this.filteredRevenue(), 'egresos');
  }

  get newClientsThisMonth(): number {
    return this.calcLastMonth(this.analytics.clientsTrend);
  }

  get completionRate(): string {
    const all = this.analytics.appointmentsByStatus || [];
    const completed = all.find((s: any) => s._id === 'completada')?.count || 0;
    const total = all.reduce((a: number, s: any) => a + s.count, 0);
    if (total === 0) return '0';
    return (completed / total * 100).toFixed(0);
  }

  get bookedServicesCount(): number {
    return (this.analytics.servicesBooked || []).length;
  }

  get lowStockCount(): number {
    return this.productStats.filter((p: any) => p.stock < 10).length;
  }

  setFilter(months: number) {
    this.filterRange = months;
    this.renderCharts();
  }

  private filterData<T extends { _id: string }>(items: T[]): T[] {
    if (!items || this.filterRange === 0) return items;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - this.filterRange);
    const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}`;
    return items.filter(i => i._id >= cutoffStr);
  }

  private filteredRevenue() {
    return this.filterData(this.analyticsRaw.revenueTrend || []);
  }

  ngOnInit() {
    if (typeof window !== 'undefined') {
      this.api.get('/admin/dashboard/stats').subscribe({
        next: (res: any) => { this.ingresos = res.ingresos; this.egresos = res.egresos; this.cdr.detectChanges(); },
        error: () => console.error('[Dashboard] Error al cargar stats')
      });
      this.api.get('/admin/dashboard/analytics').subscribe({
        next: (res: any) => {
          this.analyticsRaw = res;
          this.analytics = res;
          this.stats = { totalClients: res.totalClients, totalAppointments: res.totalAppointments, totalServices: res.totalServices };
          this.cdr.detectChanges();
          this.renderCharts();
        },
        error: () => console.error('[Dashboard] Error al cargar analytics')
      });
      this.api.get('/admin/dashboard/product-sales').subscribe({
        next: (res: any) => { this.productStats = res.productStats || []; this.cdr.detectChanges(); },
        error: () => console.error('[Dashboard] Error al cargar product-sales')
      });
    }
  }

  ngAfterViewInit() {}

  ngOnDestroy() {
    this.charts.forEach((c: any) => c.destroy());
    this.charts = [];
  }

  exportCsv() {
    if (typeof window !== 'undefined') {
      this.exporting = 'csv';
      const token = localStorage.getItem('luxury_token');
      window.open((this.api as any)['baseUrl'] + '/admin/dashboard/export?token=' + encodeURIComponent(token || ''), '_blank');
      setTimeout(() => this.exporting = null, 3000);
    }
  }

  exportPowerBi() {
    if (typeof window !== 'undefined') {
      this.exporting = 'powerbi';
      const token = localStorage.getItem('luxury_token');
      window.open((this.api as any)['baseUrl'] + '/admin/dashboard/powerbi?token=' + encodeURIComponent(token || ''), '_blank');
      setTimeout(() => this.exporting = null, 3000);
    }
  }

  private renderCharts() {
    this.charts.forEach((c: any) => c.destroy());
    this.charts = [];
    setTimeout(() => {
      this.renderRevenueChart();
      this.renderStatusChart();
      this.renderServicesChart();
      this.renderClientsChart();
      this.renderAppointmentsLine();
      this.renderStockCritical();
    });
  }

  private renderRevenueChart() {
    const el = this.revCanvas.first?.nativeElement;
    if (!el) return;
    const items = this.filteredRevenue();
    const labels = items.map((i: any) => i._id);
    const ingresosData = items.map((i: any) => +i.ingresos);
    const egresosData = items.map((i: any) => +i.egresos);
    const chart = new Chart(el, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Ingresos', data: ingresosData, backgroundColor: CHART_COLORS.green[0], borderColor: CHART_COLORS.green[2], borderWidth: 1, borderRadius: 4 },
          { label: 'Egresos', data: egresosData, backgroundColor: CHART_COLORS.red[0], borderColor: CHART_COLORS.red[2], borderWidth: 1, borderRadius: 4 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: { duration: 400 },
        interaction: { mode: 'index', intersect: false },
        hover: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top', labels: { boxWidth: 12, padding: 14, usePointStyle: true },
            onClick: (_e, legendItem, legend) => {
              const chart = legend.chart;
              const index = legendItem.datasetIndex!;
              const meta = chart.getDatasetMeta(index);
              meta.hidden = !meta.hidden;
              chart.update();
            }
          },
          tooltip: {
            backgroundColor: '#1f2937', titleColor: '#f9fafb', bodyColor: '#d1d5db',
            padding: 10, cornerRadius: 8, titleFont: { size: 13 }, bodyFont: { size: 12 },
            callbacks: {
              label: ctx => `${ctx.dataset.label}: $${Number(ctx.raw).toLocaleString('en-US')} COP`
            }
          }
        },
        scales: {
          x: { ticks: { color: '#6b7280' }, grid: { color: '#f3f4f6' } },
          y: { ticks: { color: '#6b7280', callback: v => '$' + Number(v).toLocaleString() }, grid: { color: '#f3f4f6' } }
        }
      }
    });
    this.charts.push(chart);
  }

  private renderStatusChart() {
    const el = this.statusCanvas.first?.nativeElement;
    if (!el) return;
    const items = this.analytics.appointmentsByStatus || [];
    if (!items.length) { el.parentElement!.innerHTML = '<div class="empty-state">Sin datos de citas</div>'; return; }
    const chart = new Chart(el, {
      type: 'doughnut',
      data: {
        labels: items.map((i: any) => STATUS_LABELS[i._id] || i._id),
        datasets: [{
          data: items.map((i: any) => i.count),
          backgroundColor: items.map((i: any) => STATUS_COLORS[i._id] || '#9ca3af'),
          borderWidth: 2,
          borderColor: '#fff',
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '62%', animation: { animateRotate: true, duration: 500 },
        interaction: { mode: 'nearest', intersect: true },
        hover: { mode: 'nearest', intersect: true },
        plugins: {
          legend: {
            position: 'bottom', labels: { padding: 12, boxWidth: 12, usePointStyle: true },
            onClick: (_e, legendItem, legend) => {
              const chart = legend.chart;
              const index = legendItem.datasetIndex!;
              const meta = chart.getDatasetMeta(index);
              meta.hidden = !meta.hidden;
              chart.update();
            }
          },
          tooltip: {
            backgroundColor: '#1f2937', titleColor: '#f9fafb', bodyColor: '#d1d5db',
            padding: 10, cornerRadius: 8, titleFont: { size: 13 }, bodyFont: { size: 12 },
            callbacks: {
              label: ctx => {
                const total = (ctx.dataset.data as number[]).reduce((a, b) => a + b, 0);
                const pct = ((Number(ctx.raw) / total) * 100).toFixed(1);
                return ` ${ctx.label}: ${ctx.raw} (${pct}%)`;
              }
            }
          }
        }
      }
    });
    this.charts.push(chart);
  }

  private renderServicesChart() {
    const el = this.servicesCanvas.first?.nativeElement;
    if (!el) return;
    const items = (this.analytics.servicesBooked || []).slice(0, 8);
    if (!items.length) { el.parentElement!.innerHTML = '<div class="empty-state">Sin datos de reservas</div>'; return; }
    const max = Math.max(...items.map((i: any) => i.count), 1);
    const chart = new Chart(el, {
      type: 'bar',
      data: {
        labels: items.map((i: any) => i._id.length > 22 ? i._id.slice(0, 20) + '…' : i._id),
        datasets: [{
          label: 'Reservas', data: items.map((i: any) => i.count),
          backgroundColor: items.map((i: any) => `rgba(59,130,246,${0.3 + (i.count / max) * 0.5})`),
          borderColor: CHART_COLORS.blue[2], borderWidth: 1, borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false, animation: { duration: 400 },
        interaction: { mode: 'nearest', intersect: false },
        hover: { mode: 'nearest', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1f2937', titleColor: '#f9fafb', bodyColor: '#d1d5db',
            padding: 10, cornerRadius: 8, titleFont: { size: 13 }, bodyFont: { size: 12 }
          }
        },
        scales: {
          x: { ticks: { color: '#6b7280' }, grid: { color: '#f3f4f6' } },
          y: { ticks: { color: '#6b7280', font: { size: 11 } }, grid: { display: false } }
        }
      }
    });
    this.charts.push(chart);
  }

  private renderClientsChart() {
    const el = this.clientsCanvas.first?.nativeElement;
    if (!el) return;
    const items = this.filterData(this.analytics.clientsTrend || []);
    if (!items.length) { el.parentElement!.innerHTML = '<div class="empty-state">Sin datos de clientes</div>'; return; }
    const chart = new Chart(el, {
      type: 'line',
      data: {
        labels: items.map((i: any) => i._id),
        datasets: [{
          label: 'Nuevos clientes', data: items.map((i: any) => i.count),
          borderColor: CHART_COLORS.purple[2], backgroundColor: CHART_COLORS.purple[1],
          fill: true, tension: 0.3, pointRadius: 4, pointHoverRadius: 6,
          pointBackgroundColor: CHART_COLORS.purple[2]
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: { duration: 500 },
        interaction: { mode: 'nearest', intersect: false },
        hover: { mode: 'nearest', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1f2937', titleColor: '#f9fafb', bodyColor: '#d1d5db',
            padding: 10, cornerRadius: 8, titleFont: { size: 13 }, bodyFont: { size: 12 }
          }
        },
        scales: { x: { ticks: { color: '#6b7280' }, grid: { display: false } }, y: { ticks: { color: '#6b7280' }, grid: { color: '#f3f4f6' }, beginAtZero: true } }
      }
    });
    this.charts.push(chart);
  }

  private renderAppointmentsLine() {
    const el = this.citasCanvas.first?.nativeElement;
    if (!el) return;
    const items = this.filterData(this.analytics.appointmentsTrend || []);
    if (!items.length) { el.parentElement!.innerHTML = '<div class="empty-state">Sin datos de citas</div>'; return; }
    const chart = new Chart(el, {
      type: 'line',
      data: {
        labels: items.map((i: any) => i._id),
        datasets: [{
          label: 'Citas', data: items.map((i: any) => i.count),
          borderColor: CHART_COLORS.green[2], backgroundColor: CHART_COLORS.green[1],
          fill: true, tension: 0.3, pointRadius: 4, pointHoverRadius: 6,
          pointBackgroundColor: CHART_COLORS.green[2]
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: { duration: 500 },
        interaction: { mode: 'nearest', intersect: false },
        hover: { mode: 'nearest', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1f2937', titleColor: '#f9fafb', bodyColor: '#d1d5db',
            padding: 10, cornerRadius: 8, titleFont: { size: 13 }, bodyFont: { size: 12 }
          }
        },
        scales: { x: { ticks: { color: '#6b7280' }, grid: { display: false } }, y: { ticks: { color: '#6b7280' }, grid: { color: '#f3f4f6' }, beginAtZero: true } }
      }
    });
    this.charts.push(chart);
  }

  private renderStockCritical() {
    const el = this.stockCanvas.first?.nativeElement;
    if (!el) return;
    const items = (this.productStats || []).filter((p: any) => p.stock < 10).sort((a: any, b: any) => a.stock - b.stock).slice(0, 10);
    if (!items.length) { el.parentElement!.innerHTML = '<div class="empty-state">Todo en stock suficiente</div>'; return; }
    const chart = new Chart(el, {
      type: 'bar',
      data: {
        labels: items.map((i: any) => i.nombre.length > 22 ? i.nombre.slice(0, 20) + '…' : i.nombre),
        datasets: [{
          label: 'Stock', data: items.map((i: any) => i.stock),
          backgroundColor: items.map((i: any) => i.stock < 5 ? CHART_COLORS.red[0] : CHART_COLORS.yellow[0]),
          borderColor: items.map((i: any) => i.stock < 5 ? CHART_COLORS.red[2] : CHART_COLORS.yellow[2]),
          borderWidth: 1, borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false, animation: { duration: 400 },
        interaction: { mode: 'nearest', intersect: false },
        hover: { mode: 'nearest', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1f2937', titleColor: '#f9fafb', bodyColor: '#d1d5db',
            padding: 10, cornerRadius: 8, titleFont: { size: 13 }, bodyFont: { size: 12 }
          }
        },
        scales: { x: { ticks: { color: '#6b7280' }, grid: { color: '#f3f4f6' } }, y: { ticks: { color: '#6b7280', font: { size: 11 } }, grid: { display: false } } }
      }
    });
    this.charts.push(chart);
  }

  private calcTrend(arr: any[], field: string): string {
    if (!arr || arr.length < 2) return '—';
    const last = arr[arr.length - 1][field] || 0;
    const prev = arr[arr.length - 2][field] || 0;
    if (prev === 0) return last > 0 ? '+100%' : '0%';
    const pct = ((last - prev) / prev * 100);
    return (pct > 0 ? '+' : '') + pct.toFixed(0) + '%';
  }

  private calcLastMonth(arr: any[]): number {
    if (!arr || arr.length === 0) return 0;
    return arr[arr.length - 1].count || 0;
  }
}
