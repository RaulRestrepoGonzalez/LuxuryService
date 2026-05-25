import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from 'src/app/core/services/api.service';

@Component({
  selector: 'app-appointments-mgmt',
  standalone: true,
  imports: [CommonModule, RouterModule],
  styles: [`
    :host { display: block; padding: 1.5rem 0; }
    .admin-nav { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
    .admin-nav a { padding: 0.5rem 1.1rem; border-radius: 999px; font-size: 0.8rem; font-weight: 700; text-decoration: none; color: #555; background: #fff; transition: background .2s, color .2s; border: 1px solid #ddd; }
    .admin-nav a:hover { background: #f5f5f5; color: #0a0a0a; border-color: #bbb; }
    .admin-nav a.active { background: #ff2b2b; color: #fff; border-color: #ff2b2b; }
    h2 { margin: 0 0 1.5rem; font-size: 1.5rem; color: #111827; font-weight: 800; }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    th { text-align: left; padding: 0.6rem 0.75rem; color: #6b7280; font-weight: 600; border-bottom: 2px solid #e5e7eb; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; }
    td { padding: 0.6rem 0.75rem; color: #374151; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
    tr:hover td { background: #f9fafb; }
    select { padding: 0.35rem 0.6rem; border-radius: 6px; border: 1px solid #d1d5db; background: #fff; color: #111827; font-size: 0.78rem; outline: none; cursor: pointer; }
    select:focus { border-color: #ff2b2b; }
    select option { background: #fff; color: #111827; }
    .badge { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.7rem; font-weight: 600; }
    .estado-pendiente { background: rgba(250,204,21,0.15); color: #a16207; }
    .estado-confirmada { background: rgba(34,197,94,0.15); color: #16a34a; }
    .estado-completada { background: rgba(59,130,246,0.15); color: #2563eb; }
    .estado-cancelada { background: rgba(239,68,68,0.15); color: #dc2626; }
    .empty { color: #9ca3af; text-align: center; padding: 3rem 0; font-size: 0.9rem; }
    .cliente-info { font-size: 0.78rem; color: #6b7280; margin-top: 0.15rem; }
    .page-content { background: #f3f4f6; border-radius: 16px; padding: 2rem; }
    .card { background: #fff; border-radius: 14px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
  `],
  template: `
    <nav class="admin-nav">
      <a routerLink="/admin/dashboard" routerLinkActive="active">Dashboard</a>
      <a routerLink="/admin/citas" routerLinkActive="active">Citas</a>
      <a routerLink="/admin/inventario" routerLinkActive="active">Inventario</a>
      <a routerLink="/admin/importar" routerLinkActive="active">Importar</a>
      <a routerLink="/admin/email-settings" routerLinkActive="active">Email</a>
    </nav>

    <h2>Gestión de Citas</h2>

    <div class="page-content">
    <div class="card">
    <table>
      <thead>
        <tr><th>Fecha</th><th>Hora</th><th>Cliente</th><th>Servicio</th><th>Estado</th><th>Cambiar</th></tr>
      </thead>
      <tbody>
        @for (c of citas; track c.id) {
          <tr>
            <td>{{ c.fecha }}</td>
            <td>{{ c.horario }}</td>
            <td>
              {{ c.cliente_nombre || '—' }}
              @if (c.cliente_email) { <div class="cliente-info">{{ c.cliente_email }}</div> }
            </td>
            <td>{{ c.servicio_nombre || '—' }}</td>
            <td><span class="badge" [class]="'estado-' + c.estado">{{ c.estado }}</span></td>
            <td>
              <select (change)="cambiarEstado(c.id, $event)">
                <option value="pendiente" [selected]="c.estado === 'pendiente'">pendiente</option>
                <option value="confirmada" [selected]="c.estado === 'confirmada'">confirmada</option>
                <option value="completada" [selected]="c.estado === 'completada'">completada</option>
                <option value="cancelada" [selected]="c.estado === 'cancelada'">cancelada</option>
              </select>
            </td>
          </tr>
        }
      </tbody>
    </table>
    @if (citas.length === 0) {
      <div class="empty">No hay citas registradas</div>
    }
    </div>
    </div>
  `
})
export class AppointmentsMgmtComponent implements OnInit {
  citas: any[] = [];
  constructor(private api: ApiService) {}
  ngOnInit() {
    if (typeof window !== 'undefined') this.cargar();
  }
  cargar() {
    this.api.get('/admin/appointments').subscribe(res => this.citas = res as any[]);
  }
  cambiarEstado(id: string, event: any) {
    this.api.put(`/admin/appointments/${id}/status`, { estado: event.target.value }).subscribe(() => this.cargar());
  }
}
