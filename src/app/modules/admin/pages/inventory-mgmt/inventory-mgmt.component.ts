import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { ApiService } from 'src/app/core/services/api.service';

@Component({
  selector: 'app-inventory-mgmt',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  styles: [`
    :host { display: block; padding: 1.5rem 0; }
    .admin-nav { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
    .admin-nav a { padding: 0.5rem 1.1rem; border-radius: 999px; font-size: 0.8rem; font-weight: 700; text-decoration: none; color: rgba(255,255,255,0.5); background: rgba(255,255,255,0.05); transition: background .2s, color .2s; border: 1px solid transparent; }
    .admin-nav a:hover { background: rgba(255,255,255,0.1); color: #fff; }
    .admin-nav a.active { background: #ff2b2b; color: #fff; border-color: #ff2b2b; }
    h2 { margin: 0 0 1.25rem; font-size: 1.3rem; color: #fff; font-weight: 800; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
    @media (max-width: 1000px) { .grid-2 { grid-template-columns: 1fr; } }
    .col { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 1rem; min-width: 0; }
    .bar { display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; margin-bottom: 0.75rem; }
    .bar button { padding: 0.4rem 1rem; border-radius: 999px; border: none; font-size: 0.75rem; font-weight: 700; cursor: pointer; background: #ff2b2b; color: #fff; transition: opacity .2s; white-space: nowrap; }
    .bar button:hover { opacity: .85; }
    .bar button.sec { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.7); }
    .bar button.sec:hover { background: rgba(255,255,255,0.15); color: #fff; }
    .scroll-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 0.78rem; }
    th { text-align: left; padding: 0.45rem 0.5rem; color: rgba(255,255,255,0.4); font-weight: 600; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap; }
    td { padding: 0.4rem 0.5rem; color: rgba(255,255,255,0.85); border-bottom: 1px solid rgba(255,255,255,0.04); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px; }
    tr:hover td { background: rgba(255,255,255,0.02); }
    .badge { display: inline-block; padding: 0.1rem 0.4rem; border-radius: 999px; font-size: 0.65rem; font-weight: 600; white-space: nowrap; }
    .badge-on { background: rgba(34,197,94,0.15); color: #22c55e; }
    .badge-off { background: rgba(239,68,68,0.15); color: #ef4444; }
    .badge-cat { background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.5); }
    .actions { display: flex; gap: 0.25rem; flex-wrap: wrap; }
    .actions button { padding: 0.2rem 0.45rem; border-radius: 5px; border: none; font-size: 0.62rem; font-weight: 600; cursor: pointer; transition: opacity .2s; white-space: nowrap; }
    .actions button:hover { opacity: .8; }
    .btn-edit { background: rgba(59,130,246,0.15); color: #60a5fa; }
    .btn-del { background: rgba(239,68,68,0.15); color: #ef4444; }
    .btn-toggle-on { background: rgba(34,197,94,0.15); color: #22c55e; }
    .btn-toggle-off { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.5); }
    .form-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 1rem; margin-bottom: 0.75rem; font-size: 0.82rem; }
    .form-card h3 { margin: 0 0 0.75rem; font-size: 0.9rem; color: #fff; }
    .form-row { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.5rem; }
    .form-row input, .form-row select { flex: 1; min-width: 100px; padding: 0.4rem 0.6rem; border-radius: 7px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.3); color: #fff; font-size: 0.75rem; outline: none; }
    .form-row input:focus, .form-row select:focus { border-color: #ff2b2b; }
    .form-row input::placeholder { color: rgba(255,255,255,0.25); }
    .form-actions { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
    .form-actions button { padding: 0.4rem 1rem; border-radius: 999px; border: none; font-size: 0.75rem; font-weight: 700; cursor: pointer; transition: opacity .2s; }
    .form-actions .save { background: #ff2b2b; color: #fff; }
    .form-actions .cancel { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.6); }
    .form-actions button:hover { opacity: .85; }
    .empty { color: rgba(255,255,255,0.3); text-align: center; padding: 2rem 0; font-size: 0.8rem; }
    select option { background: #1a1a1a; color: #fff; }
  `],
  template: `
    <nav class="admin-nav">
      <a routerLink="/admin/dashboard" routerLinkActive="active">Dashboard</a>
      <a routerLink="/admin/citas" routerLinkActive="active">Citas</a>
      <a routerLink="/admin/inventario" routerLinkActive="active">Inventario</a>
      <a routerLink="/admin/importar" routerLinkActive="active">Importar</a>
      <a routerLink="/admin/email-settings" routerLinkActive="active">Email</a>
    </nav>

    <div class="grid-2">

      <!-- ========== PRODUCTOS ========== -->
      <div class="col">
        <h2>Productos</h2>
        <div class="bar">
          <button (click)="showProdForm = !showProdForm; prodEdt = null; productoForm.reset({ stock: 0, precio: 0 })">
            {{ showProdForm ? 'Cancelar' : '+ Añadir' }}
          </button>
          <span style="font-size:0.75rem;color:rgba(255,255,255,0.35)">{{ productos.length }} registros</span>
        </div>

        @if (showProdForm) {
          <div class="form-card">
            <h3>{{ prodEdt ? 'Editar' : 'Nuevo producto' }}</h3>
            <form [formGroup]="productoForm" (ngSubmit)="guardarProducto()">
              <div class="form-row">
                <input formControlName="nombre" placeholder="Nombre">
                <input formControlName="descripcion" placeholder="Descripción">
              </div>
              <div class="form-row">
                <input formControlName="categoria" placeholder="Categoría">
                <input formControlName="precio" type="number" placeholder="Precio">
                <input formControlName="stock" type="number" placeholder="Stock">
              </div>
              <div class="form-actions">
                <button type="submit" class="save" [disabled]="productoForm.invalid">{{ prodEdt ? 'Guardar' : 'Crear' }}</button>
                <button type="button" class="cancel" (click)="showProdForm = false; prodEdt = null">Cancelar</button>
              </div>
            </form>
          </div>
        }

        <div class="scroll-wrap">
          <table>
            <thead>
              <tr><th>Nombre</th><th>Cat</th><th>Precio</th><th>Stock</th><th>Estado</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              @for (p of productos; track p.id || p._id) {
                <tr>
                  <td>{{ p.nombre }}</td>
                  <td><span class="badge badge-cat">{{ p.categoria }}</span></td>
                  <td>{{ p.precio | number:'1.0-0' }}</td>
                  <td>{{ p.stock }}</td>
                  <td><span class="badge" [class.badge-on]="p.activo !== false" [class.badge-off]="p.activo === false">{{ p.activo !== false ? 'Activo' : 'Inactivo' }}</span></td>
                  <td>
                    <div class="actions">
                      <button class="btn-edit" (click)="editarProducto(p)">Editar</button>
                      <button class="btn-toggle-off" (click)="toggleProdActivo(p)">{{ p.activo !== false ? 'Desac' : 'Act' }}</button>
                      <button class="btn-del" (click)="eliminarProducto(p)">Elim</button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        @if (productos.length === 0) {
          <div class="empty">No hay productos</div>
        }
      </div>

      <!-- ========== SERVICIOS ========== -->
      <div class="col">
        <h2>Servicios</h2>
        <div class="bar">
          <button (click)="abrirFormSvc()">
            {{ showSvcForm ? 'Cancelar' : '+ Añadir' }}
          </button>
          <span style="font-size:0.75rem;color:rgba(255,255,255,0.35)">{{ servicios.length }} registros</span>
        </div>

        @if (showSvcForm) {
          <div class="form-card">
            <h3>{{ svcEdt ? 'Editar' : 'Nuevo servicio' }}</h3>
            <form [formGroup]="svcForm" (ngSubmit)="guardarServicio()">
              <div class="form-row">
                <input formControlName="nombre" placeholder="Nombre">
                <input formControlName="categoria" placeholder="Categoría">
              </div>
              <div class="form-row">
                <input formControlName="descripcion" placeholder="Descripción">
                <input formControlName="icono" placeholder="Icono">
              </div>
              <div class="form-row">
                <input formControlName="precio_auto" type="number" placeholder="Precio auto">
                <input formControlName="precio_camioneta" type="number" placeholder="Precio camioneta">
                <input formControlName="duracion_minutos" type="number" placeholder="Duración min">
              </div>
              <div class="form-actions">
                <button type="submit" class="save" [disabled]="svcForm.invalid">{{ svcEdt ? 'Guardar' : 'Crear' }}</button>
                <button type="button" class="cancel" (click)="cerrarFormSvc()">Cancelar</button>
              </div>
            </form>
          </div>
        }

        <div class="scroll-wrap">
          <table>
            <thead>
              <tr><th>Nombre</th><th>Cat</th><th>Auto</th><th>Camioneta</th><th>Dur</th><th>Estado</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              @for (s of servicios; track s.id || s._id) {
                <tr>
                  <td>{{ s.nombre }}@if (s.subcategoria) { <span class="badge badge-cat">{{ s.subcategoria }}</span> }</td>
                  <td><span class="badge badge-cat">{{ s.categoria }}</span></td>
                  <td>{{ s.precio_auto | number:'1.0-0' }}</td>
                  <td>{{ s.precio_camioneta | number:'1.0-0' }}</td>
                  <td>{{ s.duracion_minutos }}m</td>
                  <td><span class="badge" [class.badge-on]="s.activo !== false" [class.badge-off]="s.activo === false">{{ s.activo !== false ? 'Activo' : 'Inactivo' }}</span></td>
                  <td>
                    <div class="actions">
                      <button class="btn-edit" (click)="editarServicio(s)">Editar</button>
                      <button [class.btn-toggle-on]="s.activo !== false" [class.btn-toggle-off]="s.activo === false" (click)="toggleSvcActivo(s)">{{ s.activo !== false ? 'Desac' : 'Act' }}</button>
                      <button class="btn-del" (click)="eliminarServicio(s)">Elim</button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        @if (servicios.length === 0) {
          <div class="empty">No hay servicios</div>
        }
      </div>

    </div>
  `
})
export class InventoryMgmtComponent implements OnInit {
  // Products
  productos: any[] = [];
  productoForm: FormGroup;
  showProdForm = false;
  prodEdt: any = null;

  // Services
  servicios: any[] = [];
  svcForm: FormGroup;
  showSvcForm = false;
  svcEdt: any = null;

  constructor(private api: ApiService, private fb: FormBuilder, private cdr: ChangeDetectorRef) {
    this.productoForm = this.fb.group({
      nombre: ['', Validators.required],
      descripcion: [''],
      categoria: ['', Validators.required],
      precio: [0, Validators.min(1)],
      stock: [0, Validators.min(0)]
    });
    this.svcForm = this.fb.group({
      nombre: ['', Validators.required],
      descripcion: [''],
      categoria: ['', Validators.required],
      icono: ['auto_awesome'],
      precio_auto: [0, Validators.min(0)],
      precio_camioneta: [0, Validators.min(0)],
      duracion_minutos: [60, Validators.min(1)]
    });
  }

  ngOnInit() {
    if (typeof window !== 'undefined') {
      this.cargarProductos();
      this.cargarServicios();
    }
  }

  // ── Products ──

  cargarProductos() {
    this.api.get('/admin/products').subscribe({
      next: res => { this.productos = res as any[]; this.cdr.detectChanges(); },
      error: () => console.error('[Inventario] Error al cargar productos')
    });
  }

  editarProducto(p: any) {
    this.prodEdt = p;
    this.showProdForm = true;
    this.productoForm.patchValue({
      nombre: p.nombre,
      descripcion: p.descripcion || '',
      categoria: p.categoria || '',
      precio: p.precio,
      stock: p.stock
    });
  }

  guardarProducto() {
    if (this.productoForm.invalid) return;
    if (this.prodEdt) {
      this.api.put(`/admin/products/${this.prodEdt.id}`, this.productoForm.value).subscribe(() => {
        this.showProdForm = false; this.prodEdt = null; this.cargarProductos();
      });
    } else {
      this.api.post('/admin/products', this.productoForm.value).subscribe(() => {
        this.showProdForm = false; this.productoForm.reset({ stock: 0, precio: 0 }); this.cargarProductos();
      });
    }
  }

  toggleProdActivo(p: any) {
    this.api.put(`/admin/products/${p.id}`, { activo: p.activo !== false ? false : true }).subscribe(() => this.cargarProductos());
  }

  eliminarProducto(p: any) {
    if (!confirm(`¿Eliminar "${p.nombre}"?`)) return;
    this.api.delete(`/admin/products/${p.id}`).subscribe(() => this.cargarProductos());
  }

  // ── Services ──

  cargarServicios() {
    this.api.get('/admin/services').subscribe({
      next: res => { this.servicios = res as any[]; this.cdr.detectChanges(); },
      error: () => console.error('[Inventario] Error al cargar servicios')
    });
  }

  abrirFormSvc() {
    this.showSvcForm = !this.showSvcForm;
    if (!this.showSvcForm) this.svcEdt = null;
  }

  cerrarFormSvc() {
    this.showSvcForm = false;
    this.svcEdt = null;
  }

  editarServicio(s: any) {
    this.svcEdt = s;
    this.showSvcForm = true;
    this.svcForm.patchValue({
      nombre: s.nombre,
      descripcion: s.descripcion || '',
      categoria: s.categoria || '',
      icono: s.icono || 'auto_awesome',
      precio_auto: s.precio_auto,
      precio_camioneta: s.precio_camioneta,
      duracion_minutos: s.duracion_minutos
    });
  }

  guardarServicio() {
    if (this.svcForm.invalid) return;
    if (this.svcEdt) {
      this.api.put(`/admin/services/${this.svcEdt.id}`, this.svcForm.value).subscribe(() => {
        this.cerrarFormSvc(); this.cargarServicios();
      });
    } else {
      this.api.post('/admin/services', this.svcForm.value).subscribe(() => {
        this.cerrarFormSvc(); this.svcForm.reset({ icono: 'auto_awesome', duracion_minutos: 60, precio_auto: 0, precio_camioneta: 0 }); this.cargarServicios();
      });
    }
  }

  toggleSvcActivo(s: any) {
    this.api.put(`/admin/services/${s.id}`, { activo: s.activo !== false ? false : true }).subscribe(() => this.cargarServicios());
  }

  eliminarServicio(s: any) {
    if (!confirm(`¿Eliminar "${s.nombre}"?`)) return;
    this.api.delete(`/admin/services/${s.id}`).subscribe(() => this.cargarServicios());
  }
}
