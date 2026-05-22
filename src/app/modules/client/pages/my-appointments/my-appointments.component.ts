import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from 'src/app/core/services/api.service';
import { AuthService } from 'src/app/core/services/auth.service';

@Component({
  selector: 'app-my-appointments',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="my-appts">
      <div class="my-appts-welcome">
        <h2>Mis Citas</h2>
        <p class="my-appts-user">{{ user?.nombre }} &middot; {{ user?.email }}</p>
      </div>
      @if (loading) {
        <div class="my-appts-loading">
          <div class="spinner"></div>
          <p>Cargando tus citas...</p>
        </div>
      } @else if (error) {
        <div class="my-appts-error">
          <p>{{ error }}</p>
          <button class="btn-retry" (click)="cargarCitas()">Reintentar</button>
        </div>
      } @else if (citas.length === 0) {
        <p class="my-appts-empty">No tienes citas agendadas.</p>
      } @else {
        <div class="my-appts-table-wrap">
          <table class="my-appts-table">
            <thead>
              <tr>
                <th>Servicio</th>
                <th>Fecha</th>
                <th>Horario</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              @for (cita of citas; track cita.id) {
                <tr>
                  <td class="td-service">{{cita.servicio_nombre}}</td>
                  <td>{{formatFecha(cita.fecha)}}</td>
                  <td>{{cita.horario}}</td>
                  <td>
                    <span class="status-tag status-{{statusClass(cita.estado)}}">
                      {{statusLabel(cita.estado)}}
                    </span>
                  </td>
                  <td>
                    @if (cita.estado === 'pendiente_pago' || cita.estado === 'pendiente') {
                      <button class="btn-cancel" (click)="cancelar(cita.id)" title="Cancelar cita">Cancelar</button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    .my-appts { max-width: 960px; margin: 0 auto; padding: 2rem 1rem; }
    .my-appts-welcome { margin-bottom: 1.5rem; text-align: center; }
    .my-appts-welcome h2 { margin: 0 0 0.25rem; color: #fff; font-size: 1.6rem; font-weight: 700; }
    .my-appts-user { margin: 0; color: rgba(255,255,255,0.5); font-size: 0.9rem; }
    .my-appts-empty { color: rgba(255,255,255,0.45); text-align: center; padding: 3rem 1rem; font-size: 1rem; }

    .my-appts-loading, .my-appts-error {
      text-align: center; padding: 3rem 1rem; color: rgba(255,255,255,0.6);
    }
    .spinner {
      width: 32px; height: 32px; margin: 0 auto 1rem;
      border: 3px solid rgba(255,255,255,0.15);
      border-top-color: #e53935; border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .btn-retry {
      background: #e53935; color: #fff; border: none;
      padding: 0.5rem 1.5rem; border-radius: 8px; cursor: pointer;
      font-size: 0.85rem; margin-top: 0.75rem;
    }

    .my-appts-table-wrap {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      overflow-x: auto;
    }

    .my-appts-table {
      width: 100%;
      border-collapse: collapse;
      text-align: center;
      font-size: 0.9rem;
    }

    .my-appts-table thead {
      background: #f8f8f8;
    }

    .my-appts-table th {
      padding: 0.9rem 0.75rem;
      font-weight: 600;
      color: #333;
      text-transform: uppercase;
      font-size: 0.75rem;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #e0e0e0;
    }

    .my-appts-table td {
      padding: 0.85rem 0.75rem;
      color: #444;
      border-bottom: 1px solid #eee;
      vertical-align: middle;
    }

    .my-appts-table tbody tr:hover {
      background: #fafafa;
    }

    .my-appts-table tbody tr:last-child td {
      border-bottom: none;
    }

    .td-service {
      font-weight: 500;
      color: #1a1a1a;
      text-align: left;
      padding-left: 1.25rem;
    }

    .status-tag {
      display: inline-block;
      padding: 0.3rem 0.75rem;
      border-radius: 999px;
      font-size: 0.78rem;
      font-weight: 600;
      letter-spacing: 0.3px;
    }

    .status-pending {
      background: #fff3e0;
      color: #e65100;
    }

    .status-confirmed {
      background: #e8f5e9;
      color: #2e7d32;
    }

    .status-cancelled {
      background: #fce4ec;
      color: #c62828;
    }

    .status-done {
      background: #e3f2fd;
      color: #1565c0;
    }

    .btn-cancel {
      background: none;
      border: 1px solid #e57373;
      color: #e53935;
      padding: 0.3rem 0.85rem;
      border-radius: 6px;
      font-size: 0.78rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-cancel:hover {
      background: #e53935;
      color: #fff;
    }
  `]
})
export class MyAppointmentsComponent implements OnInit {
  citas: any[] = [];
  user: ReturnType<AuthService['getCurrentUser']> = null;
  loading = false;
  error = '';

  constructor(private api: ApiService, private auth: AuthService) {
    this.user = this.auth.getCurrentUser();
  }

  ngOnInit() {
    this.cargarCitas();
  }

  cargarCitas() {
    if (typeof window === 'undefined') return;
    this.loading = true;
    this.error = '';
    this.api.get('/appointments/my', 0, 'citas').subscribe({
      next: res => { this.citas = res as any[]; this.loading = false; },
      error: err => { this.loading = false; this.error = 'Error al cargar las citas. Verifica tu conexión.'; }
    });
  }

  cancelar(id: number) {
    this.api.put(`/appointments/${id}/cancel`, {}).subscribe({
      next: () => this.cargarCitas(),
      error: () => this.error = 'Error al cancelar la cita.'
    });
  }

  formatFecha(f: string): string {
    if (!f) return '';
    const parts = f.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return f;
  }

  statusClass(estado: string): string {
    if (estado === 'pendiente_pago' || estado === 'pendiente') return 'pending';
    if (estado === 'confirmada') return 'confirmed';
    if (estado === 'cancelada') return 'cancelled';
    return 'done';
  }

  statusLabel(estado: string): string {
    const labels: Record<string, string> = {
      pendiente_pago: 'Pendiente de pago', pendiente: 'Pendiente', confirmada: 'Confirmada',
      cancelada: 'Cancelada', completada: 'Completada'
    };
    return labels[estado] || estado;
  }
}
