import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from 'src/app/core/services/api.service';

@Component({
  selector: 'app-email-settings',
  standalone: true,
  imports: [CommonModule, RouterModule],
  styles: [`
    :host { display: block; padding: 1.5rem 0; }
    .admin-nav { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
    .admin-nav a { padding: 0.5rem 1.1rem; border-radius: 999px; font-size: 0.8rem; font-weight: 700; text-decoration: none; color: #555; background: #fff; transition: background .2s, color .2s; border: 1px solid #ddd; }
    .admin-nav a:hover { background: #f5f5f5; color: #0a0a0a; border-color: #bbb; }
    .admin-nav a.active { background: #ff2b2b; color: #fff; border-color: #ff2b2b; }
    .page-header { margin-bottom: 1.5rem; }
    .page-header h2 { margin: 0; font-size: 1.5rem; color: #111827; font-weight: 800; }
    .page-header p { margin: 0.2rem 0 0; font-size: 0.85rem; color: #6b7280; }
    .page-content { background: #f3f4f6; border-radius: 16px; padding: 2rem; }
    .card { background: #fff; border-radius: 14px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.06); margin-bottom: 1.25rem; }
    .card h3 { margin: 0 0 0.75rem; font-size: 1rem; color: #111827; font-weight: 700; }
    .card p { margin: 0 0 0.5rem; font-size: 0.85rem; color: #6b7280; line-height: 1.5; }
    .status-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.65rem 0; border-bottom: 1px solid #f0f0f0; font-size: 0.88rem; }
    .status-row:last-child { border-bottom: none; }
    .status-label { color: #6b7280; min-width: 130px; }
    .status-value { color: #111827; font-weight: 600; }
    .badge { display: inline-block; padding: 0.25rem 0.65rem; border-radius: 999px; font-size: 0.75rem; font-weight: 700; }
    .badge.ok { background: #f0fdf4; color: #16a34a; }
    .badge.warn { background: #fef2f2; color: #dc2626; }
    .actions { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 0.5rem; }
    .btn { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.6rem 1.2rem; border-radius: 999px; font-size: 0.82rem; font-weight: 700; cursor: pointer; border: none; transition: opacity .2s, transform .15s; }
    .btn:hover { opacity: 0.9; transform: translateY(-1px); }
    .btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
    .btn-primary { background: #111827; color: #fff; }
    .btn-secondary { background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; }
    .btn-success { background: #22c55e; color: #fff; }
    .msg { padding: 0.65rem 1rem; border-radius: 0.75rem; font-size: 0.85rem; margin-top: 0.75rem; }
    .msg.success { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
    .msg.error { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
    .msg.info { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; }
    .empty-state { text-align: center; padding: 1.5rem; color: #9ca3af; font-size: 0.85rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
    th { text-align: left; padding: 0.5rem 0.65rem; color: #9ca3af; font-weight: 600; text-transform: uppercase; font-size: 0.68rem; letter-spacing: 0.05em; border-bottom: 2px solid #e8e8e8; }
    td { padding: 0.5rem 0.65rem; color: #374151; border-bottom: 1px solid #f0f0f0; word-break: break-all; }
    .setup-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.75rem; padding: 1rem; margin-top: 0.75rem; }
    .setup-box code { display: block; background: #1f2937; padding: 0.75rem; border-radius: 0.5rem; font-size: 0.78rem; color: #f2c811; margin: 0.5rem 0; white-space: pre-wrap; }
    .setup-box ol { padding-left: 1.25rem; margin: 0.5rem 0; }
    .setup-box li { font-size: 0.83rem; color: #4b5563; line-height: 1.7; }
  `],
  template: `
    <nav class="admin-nav">
      <a routerLink="/admin/dashboard" routerLinkActive="active">Dashboard</a>
      <a routerLink="/admin/citas" routerLinkActive="active">Citas</a>
      <a routerLink="/admin/inventario" routerLinkActive="active">Inventario</a>
      <a routerLink="/admin/importar" routerLinkActive="active">Importar</a>
      <a routerLink="/admin/email-settings" routerLinkActive="active">Email</a>
    </nav>

    <div class="page-header">
      <h2>📧 Configuración de email</h2>
      <p>Estado del servidor SMTP y gestión de correos pendientes</p>
    </div>

    <div class="page-content">
    <div class="card">
      <h3>Estado SMTP</h3>
      @if (loading) {
        <p class="empty-state">Cargando...</p>
      } @else {
        <div class="status-row">
          <span class="status-label">Estado</span>
          <span class="status-value">
            <span class="badge" [class.ok]="status.verificado" [class.warn]="!status.verificado">
              {{ status.verificado ? '✅ Verificado' : status.configurado ? '⚠️ No verificado' : '❌ No configurado' }}
            </span>
          </span>
        </div>
        <div class="status-row">
          <span class="status-label">Host</span>
          <span class="status-value">{{ status.host }}</span>
        </div>
        <div class="status-row">
          <span class="status-label">Remitente</span>
          <span class="status-value">{{ status.from }}</span>
        </div>
        <div class="status-row">
          <span class="status-label">Modo</span>
          <span class="status-value">{{ status.modo }}</span>
        </div>
        <div class="status-row">
          <span class="status-label">Cola pendientes</span>
          <span class="status-value">{{ status.colaPendientes ? '✅ Activa' : '❌ Inactiva' }}</span>
        </div>
        <div class="status-row">
          <span class="status-label">Emails pendientes</span>
          <span class="status-value">{{ pendingEmails.length }}</span>
        </div>

        <div class="actions">
          <button class="btn btn-primary" (click)="sendTest()" [disabled]="sending">
            {{ sending ? 'Enviando...' : '📨 Enviar prueba' }}
          </button>
          <button class="btn btn-secondary" (click)="retryPending()" [disabled]="retrying || pendingEmails.length === 0">
            {{ retrying ? 'Reenviando...' : '🔄 Reenviar pendientes' }}
          </button>
          <button class="btn btn-secondary" (click)="refresh()">🔄 Refrescar</button>
        </div>

        @if (msg) {
          <div class="msg" [class.success]="msg.type === 'success'" [class.error]="msg.type === 'error'" [class.info]="msg.type === 'info'">
            {{ msg.text }}
          </div>
        }
      }
    </div>

    @if (!status.configurado) {
      <div class="card">
        <h3>Cómo configurar SMTP</h3>
        <p style="color:#6b7280;font-size:0.85rem;margin:0 0 0.5rem;">
          Edita el archivo <code>server/.env</code> con las credenciales de un servicio SMTP gratuito:
        </p>
        <div class="setup-box">
          <strong style="color:#111827;">Opción 1 — Outlook (tu correo actual)</strong>
          <code>SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=luxuryservicemss@outlook.com
SMTP_PASS=TU_CONTRASEÑA_DE_OUTLOOK
SMTP_FROM=luxuryservicemss@outlook.com</code>
          <ol>
            <li>Usa tu contraseña normal de Outlook</li>
            <li>Si tienes verificación en 2 pasos, genera una Contraseña de Aplicación en <a href="https://account.live.com/security" target="_blank" style="color:#3b82f6;">cuenta.live.com</a></li>
            <li>Guarda el archivo y reinicia el servidor</li>
          </ol>
        </div>
        <div class="setup-box" style="margin-top:0.75rem;">
          <strong style="color:#111827;">Opción 2 — Gmail (App Password, 500 emails/día gratis)</strong>
          <ol>
            <li>Crea una cuenta Gmail o usa una existente</li>
            <li>Activa verificación en 2 pasos: <a href="https://myaccount.google.com/security" target="_blank" style="color:#3b82f6;">myaccount.google.com/security</a></li>
            <li>Genera App Password: <a href="https://myaccount.google.com/apppasswords" target="_blank" style="color:#3b82f6;">myaccount.google.com/apppasswords</a></li>
            <li>Copia el password de 16 caracteres en SMTP_PASS</li>
          </ol>
          <code>SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=TU_CORREO@gmail.com
SMTP_PASS=abcd efgh ijkl mnop
SMTP_FROM=TU_CORREO@gmail.com
SMTP_FROM_NAME=Luxury Service Manga</code>
        </div>
      </div>
    }

    @if (pendingEmails.length > 0) {
      <div class="card">
        <h3>Emails pendientes ({{ pendingEmails.length }})</h3>
        <div style="overflow-x:auto;">
          <table>
            <thead><tr><th>Para</th><th>Asunto</th><th>Intentos</th><th>Creado</th></tr></thead>
            <tbody>
              @for (e of pendingEmails; track e.id) {
                <tr>
                  <td>{{ e.to }}</td>
                  <td>{{ e.asunto }}</td>
                  <td>{{ e.intentos || 0 }}</td>
                  <td>{{ e.createdAt | date:'dd/MM HH:mm' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    }
    </div>
  `
})
export class EmailSettingsComponent implements OnInit {
  loading = true;
  sending = false;
  retrying = false;
  status: any = {};
  pendingEmails: any[] = [];
  msg: { text: string; type: string } | null = null;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.refresh();
  }

  refresh() {
    this.loading = true;
    this.msg = null;
    this.api.get('/admin/email-status').subscribe((s: any) => {
      this.status = s;
      this.loading = false;
    });
    this.api.get('/admin/pending-emails').subscribe((list: any) => {
      this.pendingEmails = list;
    });
  }

  sendTest() {
    this.sending = true;
    this.msg = null;
    this.api.post('/admin/test-email', {}).subscribe({
      next: (res: any) => {
        this.sending = false;
        this.msg = { text: '✅ Email de prueba enviado. Revisa tu bandeja de entrada.', type: 'success' };
      },
      error: (err: any) => {
        this.sending = false;
        this.msg = { text: '❌ ' + (err?.error?.error || err?.error?.message || 'Error enviando email de prueba'), type: 'error' };
      }
    });
  }

  retryPending() {
    this.retrying = true;
    this.msg = null;
    this.api.post('/admin/retry-emails', {}).subscribe({
      next: (res: any) => {
        this.retrying = false;
        this.msg = { text: `✅ Reenviados: ${res.reenviados} · Fallaron: ${res.fallaron}`, type: 'info' };
        this.refresh();
      },
      error: () => {
        this.retrying = false;
        this.msg = { text: '❌ Error al reenviar emails pendientes', type: 'error' };
      }
    });
  }
}
