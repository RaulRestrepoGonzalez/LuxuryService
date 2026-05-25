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
    h2 { margin: 0 0 1.5rem; font-size: 1.5rem; color: #fff; font-weight: 800; }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    th { text-align: left; padding: 0.6rem 0.75rem; color: rgba(255,255,255,0.4); font-weight: 600; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; }
    td { padding: 0.6rem 0.75rem; color: rgba(255,255,255,0.85); border-bottom: 1px solid rgba(255,255,255,0.04); vertical-align: middle; }
    tr:hover td { background: rgba(255,255,255,0.02); }
    select { padding: 0.35rem 0.6rem; border-radius: 6px; border: 1px solid rgba(255,255,255,0.12); background: rgba(0,0,0,0.3); color: #fff; font-size: 0.78rem; outline: none; cursor: pointer; }
    select:focus { border-color: #ff2b2b; }
    select option { background: #1a1a1a; color: #fff; }
    .badge { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.7rem; font-weight: 600; }
    .estado-pendiente { background: rgba(250,204,21,0.15); color: #facc15; }
    .estado-confirmada { background: rgba(34,197,94,0.15); color: #22c55e; }
    .estado-completada { background: rgba(59,130,246,0.15); color: #60a5fa; }
    .estado-cancelada { background: rgba(239,68,68,0.15); color: #ef4444; }
    .empty { color: rgba(255,255,255,0.3); text-align: center; padding: 3rem 0; font-size: 0.9rem; }
    .cliente-info { font-size: 0.78rem; color: rgba(255,255,255,0.5); margin-top: 0.15rem; }
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
