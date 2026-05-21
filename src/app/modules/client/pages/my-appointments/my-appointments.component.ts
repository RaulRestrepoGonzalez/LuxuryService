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
      <div class="card table-card">
        @if (citas.length === 0) {
          <p class="my-appts-empty">No tienes citas agendadas.</p>
        } @else {
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Horario</th>
                <th>Servicio</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (cita of citas; track cita.id) {
                <tr>
                  <td>{{cita.fecha}}</td>
                  <td>{{cita.horario}}</td>
                  <td>{{cita.servicio_nombre}}</td>
                  <td><span class="status-tag">{{cita.estado}}</span></td>
                  <td>
                    @if (cita.estado === 'pendiente') {
                      <button class="button-clear" (click)="cancelar(cita.id)">Cancelar</button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    </div>
  `,
  styles: [`
    .my-appts { max-width: 900px; margin: 0 auto; padding: 2rem 0; }
    .my-appts-welcome { margin-bottom: 2rem; }
    .my-appts-welcome h2 { margin: 0 0 0.25rem; color: #fff; font-size: 1.6rem; }
    .my-appts-user { margin: 0; color: rgba(255,255,255,0.55); font-size: 0.9rem; }
    .my-appts-empty { color: rgba(255,255,255,0.5); text-align: center; padding: 2rem; }
  `]
})
export class MyAppointmentsComponent implements OnInit {
  citas: any[] = [];
  user: ReturnType<AuthService['getCurrentUser']> = null;

  constructor(private api: ApiService, private auth: AuthService) {
    this.user = this.auth.getCurrentUser();
  }

  ngOnInit() {
    if (typeof window !== 'undefined') {
      this.api.get('/appointments/my').subscribe(res => this.citas = res as any[]);
    }
  }
  cancelar(id: number) { this.api.put(`/appointments/${id}/cancel`, {}).subscribe(() => this.ngOnInit()); }
}
