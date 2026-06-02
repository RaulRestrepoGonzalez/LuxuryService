import { Component, OnInit, AfterViewInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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
  imports: [CommonModule, FormsModule, RouterLink],
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

      @if (auth.isAdmin()) {
        <div class="admin-servicios">
          <div class="admin-servicios-header">
            <h3>Gestión de Servicios</h3>
            <span class="admin-count">{{ servicios.length }} servicios</span>
          </div>
          <div class="admin-search">
            <input type="text" [(ngModel)]="adminSearch" placeholder="Buscar servicio…" class="admin-search-input" />
          </div>
          <div class="admin-servicios-list">
            @for (s of filteredAdminServicios; track s.id) {
              <div class="admin-servicio-row" [class.inactive]="!s.activo">
                <div class="admin-servicio-info">
                  <span class="admin-servicio-name">{{ s.nombre }}</span>
                  <span class="admin-servicio-cat">{{ s.categoria }}</span>
                </div>
                <label class="admin-toggle" [title]="s.activo ? 'Desactivar' : 'Activar'">
                  <input type="checkbox" [checked]="s.activo" (change)="toggleServicio(s)" />
                  <span class="admin-toggle-track"><span class="admin-toggle-knob"></span></span>
                </label>
              </div>
            }
          </div>
          @if (adminError) {
            <p class="admin-error">{{ adminError }}</p>
          }
          @if (adminSuccess) {
            <p class="admin-success">{{ adminSuccess }}</p>
          }
          <div class="admin-servicios-cta">
            <a routerLink="/admin/inventario" class="admin-link">Ir al inventario completo →</a>
          </div>
        </div>
      }

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
      background: #fff;
      border: 1px solid #e0e0e0;
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
    .notif-item h4 { margin: 0.35rem 0; color: #000; }
    .notif-item p { margin: 0; color: #333; font-size: 0.9rem; }

    .admin-servicios { margin: 2rem 0; padding: 1.25rem; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,43,43,0.15); border-radius: 8px; }
    .admin-servicios-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; }
    .admin-servicios-header h3 { margin: 0; font-size: 1rem; color: #ff2b2b; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; }
    .admin-count { font-size: 0.75rem; color: rgba(255,255,255,0.4); font-weight: 600; }
    .admin-search { margin-bottom: 0.75rem; }
    .admin-search-input { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.3); border-radius: 4px; font-size: 0.82rem; color: #fff; outline: none; box-sizing: border-box; font-family: inherit; }
    .admin-search-input:focus { border-color: #ff2b2b; }
    .admin-search-input::placeholder { color: rgba(255,255,255,0.3); }
    .admin-servicios-list { display: flex; flex-direction: column; gap: 0.25rem; max-height: 400px; overflow-y: auto; }
    .admin-servicio-row { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.75rem; background: rgba(255,255,255,0.03); border-radius: 4px; transition: background 0.15s; }
    .admin-servicio-row:hover { background: rgba(255,255,255,0.06); }
    .admin-servicio-row.inactive { opacity: 0.5; }
    .admin-servicio-info { display: flex; flex-direction: column; min-width: 0; }
    .admin-servicio-name { font-size: 0.82rem; font-weight: 600; color: rgba(255,255,255,0.9); }
    .admin-servicio-cat { font-size: 0.65rem; color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 0.04em; }
    .admin-toggle { position: relative; display: inline-flex; align-items: center; cursor: pointer; flex-shrink: 0; }
    .admin-toggle input { position: absolute; opacity: 0; width: 0; height: 0; }
    .admin-toggle-track { width: 36px; height: 20px; background: rgba(255,255,255,0.15); border-radius: 10px; transition: background 0.2s; position: relative; }
    .admin-toggle input:checked + .admin-toggle-track { background: #22c55e; }
    .admin-toggle-knob { position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; background: #fff; border-radius: 50%; transition: transform 0.2s; }
    .admin-toggle input:checked + .admin-toggle-track .admin-toggle-knob { transform: translateX(16px); }
    .admin-error { margin: 0.5rem 0 0; font-size: 0.78rem; color: #ef4444; }
    .admin-success { margin: 0.5rem 0 0; font-size: 0.78rem; color: #22c55e; }
    .admin-servicios-cta { margin-top: 0.75rem; text-align: center; }
    .admin-link { font-size: 0.78rem; color: #ff2b2b; text-decoration: none; font-weight: 600; }
    .admin-link:hover { text-decoration: underline; }
  `]
})
export class ProfileComponent implements OnInit, AfterViewInit {
  private platformId = inject(PLATFORM_ID);
  user: ReturnType<AuthService['getCurrentUser']>;
  notificaciones: Notificacion[] = [];
  loadingNotif = true;
  revoking = false;

  servicios: any[] = [];
  adminSearch = '';
  adminError = '';
  adminSuccess = '';
  loadingServicios = false;

  constructor(public auth: AuthService, private api: ApiService, private router: Router) {
    this.user = this.auth.getCurrentUser();
  }

  ngOnInit() { /* datos se cargan en AfterViewInit solo en el browser */ }

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.auth.isLoggedIn()) {
      this.api.get<Notificacion[]>('/notifications').subscribe({
        next: res => { this.notificaciones = res; this.loadingNotif = false; },
        error: () => { this.loadingNotif = false; }
      });
    }
    if (this.auth.isAdmin()) {
      this.loadServicios();
    }
  }

  get filteredAdminServicios(): any[] {
    if (!this.adminSearch.trim()) return this.servicios;
    const q = this.adminSearch.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return this.servicios.filter(s =>
      s.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q) ||
      (s.categoria || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q)
    );
  }

  private loadServicios() {
    this.loadingServicios = true;
    this.api.get<any[]>('/admin/services').subscribe({
      next: res => {
        this.servicios = res.sort((a, b) => {
          if (a.activo !== b.activo) return a.activo ? -1 : 1;
          return (a.categoria || '').localeCompare(b.categoria || '') || a.nombre.localeCompare(b.nombre);
        });
        this.loadingServicios = false;
      },
      error: () => { this.loadingServicios = false; }
    });
  }

  toggleServicio(s: any) {
    const nuevoEstado = !s.activo;
    this.adminError = '';
    this.adminSuccess = '';
    this.api.put(`/admin/services/${s.id}`, { activo: nuevoEstado }).subscribe({
      next: () => {
        s.activo = nuevoEstado;
        this.adminSuccess = `"${s.nombre}" ${nuevoEstado ? 'activado' : 'desactivado'}`;
      },
      error: err => {
        this.adminError = err?.error?.error || 'Error al actualizar';
      }
    });
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
