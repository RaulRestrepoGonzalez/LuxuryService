import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from 'src/app/core/services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h2 class="section-title">Dashboard administrativo</h2>
    <div class="card-grid">
      <div class="card">
        <h3>Ingresos</h3>
        <p class="amount">{{ ingresos | currency:'USD':'symbol':'1.0-0' }}</p>
      </div>
      <div class="card">
        <h3>Egresos</h3>
        <p class="amount">{{ egresos | currency:'USD':'symbol':'1.0-0' }}</p>
      </div>
      <div class="card">
        <h3>Productos más vendidos</h3>
        <p *ngIf="topProducts.length === 0">No hay datos de ventas aún.</p>
        <ol *ngIf="topProducts.length > 0">
          <li *ngFor="let item of topProducts">{{ item.nombre }} — {{ item.ventas }} ventas</li>
        </ol>
      </div>
      <div class="card">
        <h3>Productos menos vendidos</h3>
        <p *ngIf="bottomProducts.length === 0">No hay datos de ventas aún.</p>
        <ol *ngIf="bottomProducts.length > 0">
          <li *ngFor="let item of bottomProducts">{{ item.nombre }} — {{ item.ventas }} ventas</li>
        </ol>
      </div>
    </div>
    <div class="table-card">
      <h3>Resumen de ventas por producto</h3>
      <table>
        <thead>
          <tr>
            <th>Producto</th>
            <th>Categoría</th>
            <th>Ventas</th>
            <th>Ingresos</th>
            <th>Stock</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let producto of productStats">
            <td>{{ producto.nombre }}</td>
            <td>{{ producto.categoria || 'General' }}</td>
            <td>{{ producto.ventas }}</td>
            <td>{{ producto.ingresos | currency:'USD':'symbol':'1.0-0' }}</td>
            <td>{{ producto.stock }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div style="margin-top: 1.5rem;">
      <button class="button-primary" (click)="exportar()">Exportar a Power BI</button>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  ingresos = 0;
  egresos = 0;
  topProducts: any[] = [];
  bottomProducts: any[] = [];
  productStats: any[] = [];

  constructor(private api: ApiService) {}

  ngOnInit() {
    if (typeof window !== 'undefined') {
      this.api.get('/admin/dashboard/stats').subscribe((res: any) => {
        this.ingresos = res.ingresos;
        this.egresos = res.egresos;
      });
      this.api.get('/admin/dashboard/product-sales').subscribe((res: any) => {
        this.productStats = res.productStats || [];
        this.topProducts = res.topProducts || [];
        this.bottomProducts = res.bottomProducts || [];
      });
    }
  }

  exportar() {
    if (typeof window !== 'undefined') {
      window.open((this.api as any)['baseUrl'] + '/admin/dashboard/export', '_blank');
    }
  }
}
