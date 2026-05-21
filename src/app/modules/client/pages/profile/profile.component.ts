import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';
import { ApiService } from 'src/app/core/services/api.service';

interface Notificacion {
  id: string;
  titulo: string;
  mensaje: string;
  tipo: string;
  leida?: boolean;
  created_at?: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="profile-page">
      <h2>Mi Perfil</h2>
      <div class="card profile-card">
        <p><strong>Nombre:</strong> {{ user?.nombre }}</p>
        <p><strong>Email:</strong> {{ user?.email }}</p>
        @if (user?.rol === 'cliente') {
          <p class="profile-hint">Accedes sin contraseña. Recibirás promociones y avisos de citas aquí.</p>
        }
        <div class="profile-actions">
          <button class="button-primary" (click)="logout()">Cerrar sesión</button>
          @if (user?.rol === 'cliente') {
            <button class="button-clear" (click)="revokeConsent()" [disabled]="revoking">Revocar consentimiento</button>
          }
        </div>
      </div>

      <h3 class="section-title">Notificaciones</h3>
      @if (loadingNotif) {
        <p>Cargando...</p>
      } @else if (notificaciones.length === 0) {
        <p class="profile-hint">Sin notificaciones aún. Al agendar una cita recibirás confirmación aquí.</p>
      } @else {
        <div class="notif-list">
          @for (n of notificaciones; track n.id) {
            <article class="notif-item" [class.unread]="!n.leida">
              <span class="notif-type">{{ n.tipo }}</span>
              <h4>{{ n.titulo }}</h4>
              <p>{{ n.mensaje }}</p>
            </article>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .profile-page { max-width: 560px; }
    .profile-card { margin-bottom: 2rem; }
    .profile-hint { font-size: 0.9rem; color: rgba(255,255,255,0.6); }
    .profile-actions { display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 1.5rem; }
    .notif-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .notif-item {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      padding: 1rem 1.25rem;
      border-radius: 4px;
    }
    .notif-item.unread { border-left: 3px solid #ff2b2b; }
    .notif-type {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #ff2b2b;
      font-weight: 700;
    }
    .notif-item h4 { margin: 0.35rem 0; color: #fff; }
    .notif-item p { margin: 0; color: rgba(255,255,255,0.75); font-size: 0.9rem; }
  `]
})
export class ProfileComponent implements OnInit {
  user: ReturnType<AuthService['getCurrentUser']>;
  notificaciones: Notificacion[] = [];
  loadingNotif = true;
  revoking = false;

  constructor(public auth: AuthService, private api: ApiService, private router: Router) {
    this.user = this.auth.getCurrentUser();
  }

  ngOnInit() {
    if (this.auth.isLoggedIn()) {
      this.api.get<Notificacion[]>('/notifications').subscribe({
        next: res => { this.notificaciones = res; this.loadingNotif = false; },
        error: () => { this.loadingNotif = false; }
      });
    }
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/acceso']);
  }

  revokeConsent() {
    if (!confirm('¿Revocar consentimiento de datos?')) return;
    this.revoking = true;
    this.auth.revokeConsent().subscribe({
      next: () => { this.auth.logout(); this.router.navigate(['/acceso']); },
      error: () => { this.revoking = false; }
    });
  }
}
