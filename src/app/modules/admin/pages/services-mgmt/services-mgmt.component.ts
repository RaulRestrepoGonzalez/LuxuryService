import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from 'src/app/core/services/api.service';

@Component({
  selector: 'app-services-mgmt',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  styles: [`
    :host { display: block; padding: 1.5rem 0; }
    .admin-nav { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
    .admin-nav a { padding: 0.5rem 1.1rem; border-radius: 999px; font-size: 0.8rem; font-weight: 700; text-decoration: none; color: #555; background: #fff; transition: background .2s, color .2s; border: 1px solid #ddd; }
    .admin-nav a:hover { background: #f5f5f5; color: #0a0a0a; border-color: #bbb; }
    .admin-nav a.active { background: #ff2b2b; color: #fff; border-color: #ff2b2b; }
    h2 { margin: 0 0 1.5rem; font-size: 1.5rem; color: #fff; font-weight: 800; }
    .bar { display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; margin-bottom: 1rem; }
    .bar button { padding: 0.5rem 1.25rem; border-radius: 999px; border: none; font-size: 0.8rem; font-weight: 700; cursor: pointer; background: #ff2b2b; color: #fff; transition: opacity .2s; }
    .bar button:hover { opacity: .85; }
    .bar button.sec { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.7); }
    .bar button.sec:hover { background: rgba(255,255,255,0.15); color: #fff; }
    table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
    th { text-align: left; padding: 0.6rem 0.75rem; color: rgba(255,255,255,0.4); font-weight: 600; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap; }
    td { padding: 0.55rem 0.75rem; color: rgba(255,255,255,0.85); border-bottom: 1px solid rgba(255,255,255,0.04); }
    tr:hover td { background: rgba(255,255,255,0.02); }
    .badge { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.68rem; font-weight: 600; }
    .badge-on { background: rgba(34,197,94,0.15); color: #22c55e; }
    .badge-off { background: rgba(239,68,68,0.15); color: #ef4444; }
    .badge-cat { background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.5); }
    .actions { display: flex; gap: 0.35rem; flex-wrap: wrap; }
    .actions button { padding: 0.25rem 0.55rem; border-radius: 6px; border: none; font-size: 0.68rem; font-weight: 600; cursor: pointer; transition: opacity .2s; white-space: nowrap; }
    .actions button:hover { opacity: .8; }
    .btn-edit { background: rgba(59,130,246,0.15); color: #60a5fa; }
    .btn-del { background: rgba(239,68,68,0.15); color: #ef4444; }
    .btn-toggle-on { background: rgba(34,197,94,0.15); color: #22c55e; }
    .btn-toggle-off { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.5); }
    .form-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 1.25rem; margin-bottom: 1.5rem; }
    .form-card h3 { margin: 0 0 1rem; font-size: 1rem; color: #fff; }
    .form-row { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 0.6rem; }
    .form-row input, .form-row select, .form-row textarea { flex: 1; min-width: 130px; padding: 0.5rem 0.7rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.3); color: #fff; font-size: 0.78rem; outline: none; }
    .form-row input:focus, .form-row select:focus, .form-row textarea:focus { border-color: #ff2b2b; }
    .form-row input::placeholder, .form-row textarea::placeholder { color: rgba(255,255,255,0.25); }
    .form-row textarea { resize: vertical; min-height: 2.5rem; }
    .form-row .half { flex: 0.5; min-width: 100px; }
    .form-actions { display: flex; gap: 0.5rem; margin-top: 0.75rem; }
    .form-actions button { padding: 0.5rem 1.25rem; border-radius: 999px; border: none; font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: opacity .2s; }
    .form-actions .save { background: #ff2b2b; color: #fff; }
    .form-actions .cancel { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.6); }
    .form-actions button:hover { opacity: .85; }
    .empty { color: rgba(255,255,255,0.3); text-align: center; padding: 3rem 0; font-size: 0.9rem; }
    select option { background: #1a1a1a; color: #fff; }
    .precio-cell { white-space: nowrap; }
  `],
  template: `
    <nav class="admin-nav">
      <a routerLink="/admin/dashboard" routerLinkActive="active">Dashboard</a>
      <a routerLink="/admin/citas" routerLinkActive="active">Citas</a>
      <a routerLink="/admin/inventario" routerLinkActive="active">Inventario</a>
      <a routerLink="/admin/servicios" routerLinkActive="active">Servicios</a>
      <a routerLink="/admin/importar" routerLinkActive="active">Importar</a>
      <a routerLink="/admin/email-settings" routerLinkActive="active">Email</a>
    </nav>

    <h2>Gestión de Servicios</h2>

    <div class="bar">
      <button (click)="abrirForm()">
        {{ showForm ? 'Cancelar' : '+ Añadir servicio' }}
      </button>
    </div>

    @if (showForm) {
      <div class="form-card">
        <h3>{{ edt ? 'Editar servicio' : 'Nuevo servicio' }}</h3>
        <form [formGroup]="svcForm" (ngSubmit)="guardar()">
          <div class="form-row">
            <input formControlName="nombre" placeholder="Nombre">
            <input formControlName="categoria" placeholder="Categoría (ej. Servicios Básicos)">
          </div>
          <div class="form-row">
            <input formControlName="descripcion" placeholder="Descripción breve">
            <input formControlName="icono" placeholder="Icono (auto_awesome)">
          </div>
          <div class="form-row">
            <input formControlName="imagen_url" placeholder="URL de imagen">
          </div>
          <div class="form-row">
            <input formControlName="precio_auto" type="number" class="half" placeholder="Precio auto">
            <input formControlName="precio_camioneta" type="number" class="half" placeholder="Precio camioneta">
            <input formControlName="precio_moto" type="number" class="half" placeholder="Precio moto">
          </div>
          <div class="form-row">
            <input formControlName="duracion_minutos" type="number" class="half" placeholder="Duración (min)">
            <input formControlName="orden" type="number" class="half" placeholder="Orden">
          </div>
          <div class="form-actions">
            <button type="submit" class="save" [disabled]="!svcForm.get('nombre')?.value || !svcForm.get('categoria')?.value">{{ edt ? 'Guardar cambios' : 'Crear servicio' }}</button>
            <button type="button" class="cancel" (click)="cerrarForm()">Cancelar</button>
          </div>
        </form>
      </div>
    }

    <table>
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Categoría</th>
          <th>Precio Auto</th>
          <th>Precio Camioneta</th>
          <th>Duración</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        @for (s of servicios; track s.id) {
          <tr>
            <td>{{ s.nombre }}@if (s.subcategoria) { <span class="badge badge-cat">{{ s.subcategoria }}</span> }</td>
            <td><span class="badge badge-cat">{{ s.categoria }}</span></td>
            <td class="precio-cell">{{ s.precio_auto | number:'1.0-0' }}</td>
            <td class="precio-cell">{{ s.precio_camioneta | number:'1.0-0' }}</td>
            <td>{{ s.duracion_minutos }} min</td>
            <td><span class="badge" [class.badge-on]="s.activo !== false" [class.badge-off]="s.activo === false">{{ s.activo !== false ? 'Activo' : 'Inactivo' }}</span></td>
            <td>
              <div class="actions">
                <button class="btn-edit" (click)="editar(s)">Editar</button>
                <button [class.btn-toggle-on]="s.activo !== false" [class.btn-toggle-off]="s.activo === false" (click)="toggleActivo(s)">{{ s.activo !== false ? 'Desactivar' : 'Activar' }}</button>
                <button class="btn-del" (click)="eliminar(s)">Eliminar</button>
              </div>
            </td>
          </tr>
        }
      </tbody>
    </table>
    @if (servicios.length === 0) {
      <div class="empty">No hay servicios registrados</div>
    }
  `
})
export class ServicesMgmtComponent implements OnInit {
  servicios: any[] = [];
  svcForm: FormGroup;
  showForm = false;
  edt: any = null;

  constructor(private api: ApiService, private fb: FormBuilder) {
    this.svcForm = this.fb.group({
      nombre: ['', Validators.required],
      descripcion: [''],
      categoria: ['', Validators.required],
      icono: ['auto_awesome'],
      imagen_url: [''],
      precio_auto: [0],
      precio_camioneta: [0],
      precio_moto: [0],
      duracion_minutos: [60],
      orden: [99]
    });
  }

  ngOnInit() {
    if (typeof window !== 'undefined') this.cargar();
  }

  cargar() {
    this.api.getFresh('/admin/services').subscribe(res => this.servicios = res as any[]);
  }

  abrirForm() {
    this.showForm = !this.showForm;
    if (!this.showForm) this.edt = null;
  }

  cerrarForm() {
    this.showForm = false;
    this.edt = null;
  }

  editar(s: any) {
    this.edt = s;
    this.showForm = true;
    this.svcForm.patchValue({
      nombre: s.nombre,
      descripcion: s.descripcion || '',
      categoria: s.categoria || '',
      icono: s.icono || 'auto_awesome',
      imagen_url: s.imagen_url || '',
      precio_auto: s.precio_auto,
      precio_camioneta: s.precio_camioneta,
      precio_moto: s.precio_moto,
      duracion_minutos: s.duracion_minutos,
      orden: s.orden
    });
  }

  guardar() {
    if (this.svcForm.invalid) return;
    if (this.edt) {
      this.api.put(`/admin/services/${this.edt.id}`, this.svcForm.value).subscribe(() => {
        this.cerrarForm(); this.cargar();
      });
    } else {
      this.api.post('/admin/services', this.svcForm.value).subscribe(() => {
        this.cerrarForm(); this.svcForm.reset({ icono: 'auto_awesome', duracion_minutos: 60, precio_auto: 0, precio_camioneta: 0, precio_moto: 0, orden: 99 }); this.cargar();
      });
    }
  }

  toggleActivo(s: any) {
    this.api.put(`/admin/services/${s.id}`, { activo: s.activo !== false ? false : true }).subscribe(() => this.cargar());
  }

  eliminar(s: any) {
    if (!confirm(`¿Eliminar "${s.nombre}"?`)) return;
    this.api.delete(`/admin/services/${s.id}`).subscribe(() => this.cargar());
  }
}
