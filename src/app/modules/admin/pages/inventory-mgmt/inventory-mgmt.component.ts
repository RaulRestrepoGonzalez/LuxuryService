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
    .admin-nav a { padding: 0.5rem 1.1rem; border-radius: 999px; font-size: 0.8rem; font-weight: 700; text-decoration: none; color: #555; background: #fff; transition: background .2s, color .2s; border: 1px solid #ddd; }
    .admin-nav a:hover { background: #f5f5f5; color: #0a0a0a; border-color: #bbb; }
    .admin-nav a.active { background: #ff2b2b; color: #fff; border-color: #ff2b2b; }
    h2 { margin: 0 0 1.25rem; font-size: 1.3rem; color: #0a0a0a; font-weight: 800; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
    @media (max-width: 1000px) { .grid-2 { grid-template-columns: 1fr; } }
    .col { background: #fff; border: 1px solid #e0e0e0; border-radius: 12px; padding: 1rem; min-width: 0; }
    .bar { display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; margin-bottom: 0.75rem; }
    .bar button { padding: 0.4rem 1rem; border-radius: 999px; border: none; font-size: 0.75rem; font-weight: 700; cursor: pointer; background: #ff2b2b; color: #fff; transition: opacity .2s; white-space: nowrap; }
    .bar button:hover { opacity: .85; }
    .bar button.sec { background: #f0f0f0; color: #555; }
    .bar button.sec:hover { background: #e0e0e0; color: #0a0a0a; }
    .scroll-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
    th { text-align: left; padding: 0.55rem 0.6rem; color: #888; font-weight: 700; border-bottom: 2px solid #e8e8e8; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap; }
    td { padding: 0.5rem 0.6rem; color: #0a0a0a; border-bottom: 1px solid #f0f0f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 160px; }
    tr:hover td { background: #fafafa; }
    .badge { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.68rem; font-weight: 600; white-space: nowrap; }
    .badge-on { background: #dcfce7; color: #16a34a; }
    .badge-off { background: #fef2f2; color: #dc2626; }
    .badge-cat { background: #f5f5f5; color: #666; }
    .actions { display: flex; gap: 0.3rem; flex-wrap: wrap; }
    .actions button { padding: 0.25rem 0.5rem; border-radius: 5px; border: 1px solid transparent; font-size: 0.65rem; font-weight: 700; cursor: pointer; transition: all .15s; white-space: nowrap; }
    .actions button:hover { opacity: .8; }
    .btn-edit { background: #eff6ff; color: #2563eb; border-color: #bfdbfe; }
    .btn-edit:hover { background: #dbeafe; }
    .btn-del { background: #fef2f2; color: #dc2626; border-color: #fecaca; }
    .btn-del:hover { background: #fee2e2; }
    .btn-toggle-on { background: #dcfce7; color: #16a34a; border-color: #bbf7d0; }
    .btn-toggle-off { background: #f5f5f5; color: #888; border-color: #e5e5e5; }
    .form-card { background: #fafafa; border: 1px solid #e8e8e8; border-radius: 10px; padding: 1rem; margin-bottom: 0.75rem; font-size: 0.82rem; }
    .form-card h3 { margin: 0 0 0.75rem; font-size: 0.9rem; color: #0a0a0a; }
    .form-row { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.5rem; }
    .form-row input, .form-row select { flex: 1; min-width: 100px; padding: 0.45rem 0.65rem; border-radius: 6px; border: 1px solid #d0d0d0; background: #fff; color: #0a0a0a; font-size: 0.78rem; outline: none; }
    .form-row input:focus, .form-row select:focus { border-color: #ff2b2b; box-shadow: 0 0 0 2px rgba(255,43,43,0.1); }
    .form-row input::placeholder { color: #aaa; }
    .form-actions { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
    .form-actions button { padding: 0.45rem 1rem; border-radius: 999px; border: none; font-size: 0.75rem; font-weight: 700; cursor: pointer; transition: opacity .2s; }
    .form-actions .save { background: #ff2b2b; color: #fff; }
    .form-actions .cancel { background: #f0f0f0; color: #555; }
    .form-actions button:hover { opacity: .85; }
    .empty { color: #aaa; text-align: center; padding: 2rem 0; font-size: 0.8rem; }
    select option { background: #fff; color: #0a0a0a; }
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
                <input formControlName="precio_moto" type="number" placeholder="Precio moto">
              </div>
              <div class="form-row">
                <input formControlName="duracion_minutos" type="number" placeholder="Duración min">
              </div>
              <div class="form-actions">
                <button type="submit" class="save" [disabled]="!svcForm.get('nombre')?.value || !svcForm.get('categoria')?.value">{{ svcEdt ? 'Guardar' : 'Crear' }}</button>
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
      precio: [0],
      stock: [0]
    });
    this.svcForm = this.fb.group({
      nombre: ['', Validators.required],
      descripcion: [''],
      categoria: ['', Validators.required],
      icono: ['auto_awesome'],
      precio_auto: [0],
      precio_camioneta: [0],
      precio_moto: [0],
      duracion_minutos: [60]
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
    this.api.getFresh('/admin/products').subscribe({
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
    this.api.getFresh('/admin/services').subscribe({
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
      precio_moto: s.precio_moto,
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
        this.cerrarFormSvc(); this.svcForm.reset({ icono: 'auto_awesome', duracion_minutos: 60, precio_auto: 0, precio_camioneta: 0, precio_moto: 0 }); this.cargarServicios();
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
