import { Component, OnInit } from '@angular/core';
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
    h2 { margin: 0 0 1.5rem; font-size: 1.5rem; color: #fff; font-weight: 800; }
    .bar { display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; margin-bottom: 1rem; }
    .bar button { padding: 0.5rem 1.25rem; border-radius: 999px; border: none; font-size: 0.8rem; font-weight: 700; cursor: pointer; background: #ff2b2b; color: #fff; transition: opacity .2s; }
    .bar button:hover { opacity: .85; }
    .bar button.sec { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.7); }
    .bar button.sec:hover { background: rgba(255,255,255,0.15); color: #fff; }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    th { text-align: left; padding: 0.6rem 0.75rem; color: rgba(255,255,255,0.4); font-weight: 600; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; }
    td { padding: 0.6rem 0.75rem; color: rgba(255,255,255,0.85); border-bottom: 1px solid rgba(255,255,255,0.04); }
    tr:hover td { background: rgba(255,255,255,0.02); }
    .badge { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.7rem; font-weight: 600; }
    .badge-on { background: rgba(34,197,94,0.15); color: #22c55e; }
    .badge-off { background: rgba(239,68,68,0.15); color: #ef4444; }
    .actions { display: flex; gap: 0.4rem; }
    .actions button { padding: 0.3rem 0.65rem; border-radius: 6px; border: none; font-size: 0.7rem; font-weight: 600; cursor: pointer; transition: opacity .2s; }
    .actions button:hover { opacity: .8; }
    .btn-edit { background: rgba(59,130,246,0.15); color: #60a5fa; }
    .btn-del { background: rgba(239,68,68,0.15); color: #ef4444; }
    .btn-toggle-on { background: rgba(34,197,94,0.15); color: #22c55e; }
    .btn-toggle-off { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.5); }
    .form-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 1.25rem; margin-bottom: 1.5rem; }
    .form-card h3 { margin: 0 0 1rem; font-size: 1rem; color: #fff; }
    .form-row { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 0.75rem; }
    .form-row input, .form-row select { flex: 1; min-width: 140px; padding: 0.55rem 0.75rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.3); color: #fff; font-size: 0.8rem; outline: none; }
    .form-row input:focus, .form-row select:focus { border-color: #ff2b2b; }
    .form-row input::placeholder { color: rgba(255,255,255,0.25); }
    .form-actions { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
    .form-actions button { padding: 0.5rem 1.25rem; border-radius: 999px; border: none; font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: opacity .2s; }
    .form-actions .save { background: #ff2b2b; color: #fff; }
    .form-actions .cancel { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.6); }
    .form-actions button:hover { opacity: .85; }
    .empty { color: rgba(255,255,255,0.3); text-align: center; padding: 3rem 0; font-size: 0.9rem; }
    select option { background: #1a1a1a; color: #fff; }
  `],
  template: `
    <nav class="admin-nav">
      <a routerLink="/admin/dashboard" routerLinkActive="active">Dashboard</a>
      <a routerLink="/admin/citas" routerLinkActive="active">Citas</a>
      <a routerLink="/admin/inventario" routerLinkActive="active">Inventario</a>
      <a routerLink="/admin/servicios" routerLinkActive="active">Servicios</a>
    </nav>

    <h2>Inventario / Productos</h2>

    <div class="bar">
      <button (click)="showForm = !showForm; edt = null; productoForm.reset({ stock: 0, precio: 0 })">
        {{ showForm ? 'Cancelar' : '+ Añadir producto' }}
      </button>
    </div>

    @if (showForm) {
      <div class="form-card">
        <h3>{{ edt ? 'Editar producto' : 'Nuevo producto' }}</h3>
        <form [formGroup]="productoForm" (ngSubmit)="guardar()">
          <div class="form-row">
            <input formControlName="nombre" placeholder="Nombre">
            <input formControlName="descripcion" placeholder="Descripción">
          </div>
          <div class="form-row">
            <input formControlName="categoria" placeholder="Categoría">
            <input formControlName="precio" type="number" placeholder="Precio COP">
            <input formControlName="stock" type="number" placeholder="Stock">
          </div>
          <div class="form-actions">
            <button type="submit" class="save" [disabled]="productoForm.invalid">{{ edt ? 'Guardar cambios' : 'Crear producto' }}</button>
            <button type="button" class="cancel" (click)="showForm = false; edt = null">Cancelar</button>
          </div>
        </form>
      </div>
    }

    <table>
      <thead>
        <tr><th>Nombre</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Estado</th><th>Acciones</th></tr>
      </thead>
      <tbody>
        @for (p of productos; track p.id) {
          <tr>
            <td>{{ p.nombre }}</td>
            <td><span class="badge" style="background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.5)">{{ p.categoria }}</span></td>
            <td>{{ p.precio | number:'1.0-0' }}</td>
            <td>{{ p.stock }}</td>
            <td><span class="badge" [class.badge-on]="p.activo !== false" [class.badge-off]="p.activo === false">{{ p.activo !== false ? 'Activo' : 'Inactivo' }}</span></td>
            <td>
              <div class="actions">
                <button class="btn-edit" (click)="editar(p)">Editar</button>
                <button class="btn-toggle-off" (click)="toggleActivo(p)">{{ p.activo !== false ? 'Desactivar' : 'Activar' }}</button>
                <button class="btn-del" (click)="eliminar(p)">Eliminar</button>
              </div>
            </td>
          </tr>
        }
      </tbody>
    </table>
    @if (productos.length === 0) {
      <div class="empty">No hay productos registrados</div>
    }
  `
})
export class InventoryMgmtComponent implements OnInit {
  productos: any[] = [];
  productoForm: FormGroup;
  showForm = false;
  edt: any = null;

  constructor(private api: ApiService, private fb: FormBuilder) {
    this.productoForm = this.fb.group({
      nombre: ['', Validators.required],
      descripcion: [''],
      categoria: ['', Validators.required],
      precio: [0, Validators.min(1)],
      stock: [0, Validators.min(0)]
    });
  }

  ngOnInit() {
    if (typeof window !== 'undefined') this.cargar();
  }

  cargar() {
    this.api.get('/admin/products').subscribe(res => this.productos = res as any[]);
  }

  editar(p: any) {
    this.edt = p;
    this.showForm = true;
    this.productoForm.patchValue({
      nombre: p.nombre,
      descripcion: p.descripcion || '',
      categoria: p.categoria || '',
      precio: p.precio,
      stock: p.stock
    });
  }

  guardar() {
    if (this.productoForm.invalid) return;
    if (this.edt) {
      this.api.put(`/admin/products/${this.edt.id}`, this.productoForm.value).subscribe(() => {
        this.showForm = false; this.edt = null; this.cargar();
      });
    } else {
      this.api.post('/admin/products', this.productoForm.value).subscribe(() => {
        this.showForm = false; this.productoForm.reset({ stock: 0, precio: 0 }); this.cargar();
      });
    }
  }

  toggleActivo(p: any) {
    this.api.put(`/admin/products/${p.id}`, { activo: p.activo !== false ? false : true }).subscribe(() => this.cargar());
  }

  eliminar(p: any) {
    if (!confirm(`¿Eliminar "${p.nombre}"?`)) return;
    this.api.delete(`/admin/products/${p.id}`).subscribe(() => this.cargar());
  }
}
