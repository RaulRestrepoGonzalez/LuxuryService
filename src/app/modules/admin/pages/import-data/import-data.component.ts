import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from 'src/app/core/services/api.service';

@Component({
  selector: 'app-import-data',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
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

    .card { background: #fff; border-radius: 14px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.06); margin-bottom: 1.5rem; }
    .card h3 { margin: 0 0 0.5rem; font-size: 1rem; color: #111827; font-weight: 700; }
    .card p { margin: 0 0 1rem; font-size: 0.85rem; color: #6b7280; line-height: 1.5; }

    .tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
    .tab { padding: 0.5rem 1.25rem; border-radius: 8px; font-size: 0.82rem; font-weight: 700; cursor: pointer; border: 1px solid #d1d5db; background: #fff; color: #374151; transition: all .15s; }
    .tab:hover { border-color: #9ca3af; }
    .tab.active { background: #111827; color: #fff; border-color: #111827; }

    .drop-zone { border: 2px dashed #d1d5db; border-radius: 12px; padding: 3rem 1.5rem; text-align: center; cursor: pointer; transition: all .2s; margin-bottom: 1rem; }
    .drop-zone:hover, .drop-zone.dragover { border-color: #3b82f6; background: rgba(59,130,246,0.04); }
    .drop-zone-icon { font-size: 2.5rem; margin-bottom: 0.75rem; }
    .drop-zone p { margin: 0 0 0.25rem; font-size: 0.9rem; color: #374151; font-weight: 600; }
    .drop-zone small { font-size: 0.78rem; color: #9ca3af; }
    .drop-zone input { display: none; }

    .file-info { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; background: #f9fafb; border-radius: 8px; margin-bottom: 1rem; }
    .file-info-name { font-weight: 600; color: #111827; font-size: 0.85rem; flex: 1; }
    .file-info-size { color: #6b7280; font-size: 0.78rem; }
    .file-info-remove { background: none; border: none; color: #ef4444; cursor: pointer; font-size: 1.2rem; padding: 0; line-height: 1; }

    .btn-primary { padding: 0.6rem 1.5rem; border-radius: 8px; font-size: 0.85rem; font-weight: 700; cursor: pointer; border: none; background: #111827; color: #fff; transition: all .15s; }
    .btn-primary:hover:not(:disabled) { background: #1f2937; transform: translateY(-1px); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

    .result-box { background: #f0fdf4; border: 1px solid #86efac; border-radius: 12px; padding: 1.25rem; margin-top: 1.5rem; }
    .result-box.error { background: #fef2f2; border-color: #fca5a5; }
    .result-box h4 { margin: 0 0 0.5rem; font-size: 0.95rem; color: #16a34a; }
    .result-box.error h4 { color: #dc2626; }
    .result-box p { margin: 0; font-size: 0.85rem; color: #374151; }
    .result-box ul { margin: 0.5rem 0 0; padding-left: 1.25rem; font-size: 0.82rem; color: #dc2626; }

    .format-card { background: #f9fafb; border-radius: 10px; padding: 1rem; margin-bottom: 1rem; }
    .format-card h4 { margin: 0 0 0.25rem; font-size: 0.85rem; color: #111827; font-weight: 700; }
    .format-card code { font-size: 0.75rem; color: #6b7280; display: block; margin-bottom: 0.5rem; white-space: pre-wrap; }
    .format-card small { font-size: 0.72rem; color: #9ca3af; display: block; }
    .checkbox-row { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; font-size: 0.85rem; color: #374151; cursor: pointer; }
    .checkbox-row input { width: 1rem; height: 1rem; accent-color: #111827; cursor: pointer; }
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
      <h2>Importar datos</h2>
      <p>Actualiza productos o servicios desde un archivo CSV o Excel</p>
    </div>

    <div class="page-content">
      <div class="tabs">
        <button class="tab" [class.active]="tipo === 'productos'" (click)="tipo = 'productos'; limpiar()">Solo Productos</button>
        <button class="tab" [class.active]="tipo === 'servicios'" (click)="tipo = 'servicios'; limpiar()">Solo Servicios</button>
        <button class="tab" [class.active]="tipo === 'combinado'" (click)="tipo = 'combinado'; limpiar()">Combinado (Prod + Serv)</button>
      </div>

      <div class="card">
        <h3>Formato esperado</h3>
        <p>El archivo debe tener una fila de encabezados con estos nombres de columna:</p>

        @if (tipo === 'productos') {
          <div class="format-card">
            <h4>Columnas para Productos</h4>
            <code>nombre, descripcion, categoria, precio, stock</code>
            <small>nombre (requerido) · descripcion · categoria · precio · stock</small>
          </div>
        } @else if (tipo === 'servicios') {
          <div class="format-card">
            <h4>Columnas para Servicios</h4>
            <code>nombre, descripcion, categoria, precio_auto, precio_camioneta, duracion_minutos</code>
            <small>nombre (requerido) · descripcion · categoria · precio_auto · precio_camioneta · duracion_minutos</small>
          </div>
        } @else {
          <div class="format-card">
            <h4>Columnas para archivo combinado</h4>
            <code>PROVEEDOR, PRODUCTO, TIPO, CLASE, VALOR_VENTA, EXISTENCIA</code>
            <small>PROVEEDOR · PRODUCTO (requerido) · TIPO (PROD o SERV) · CLASE · VALOR_VENTA · EXISTENCIA</small>
            <small style="display:block;margin-top:0.4rem;">Las filas con TIPO = PROD van a productos, TIPO = SERV van a servicios.</small>
          </div>
        }
      </div>

      <div class="card">
        <h3>Subir archivo</h3>
        <p>Selecciona un archivo CSV (.csv) o Excel (.xlsx). Si un producto/servicio ya existe por nombre, se actualizará; si no, se creará.</p>

        <label class="checkbox-row">
          <input type="checkbox" [(ngModel)]="excludeFood" />
          Excluir productos de cafetería (comidas, bebidas, cervezas, galletas, etc.)
        </label>

        <div class="drop-zone" [class.dragover]="dragover" (dragover)="dragover = true" (dragleave)="dragover = false" (drop)="onDrop($event)" (click)="fileInput.click()">
          <div class="drop-zone-icon">📁</div>
          <p>Arrastra el archivo aquí o haz clic para seleccionar</p>
          <small>CSV o Excel &middot; Máx 5 MB</small>
          <input #fileInput type="file" accept=".csv,.xlsx" (change)="onFileSelected($event)" />
        </div>

        @if (file) {
          <div class="file-info">
            <span class="file-info-name">{{ file.name }}</span>
            <span class="file-info-size">{{ (file.size / 1024).toFixed(1) }} KB</span>
            <button class="file-info-remove" (click)="limpiar()">×</button>
          </div>
          <button class="btn-primary" [disabled]="subiendo" (click)="subir()">
            @if (subiendo) { Subiendo… } @else { Subir e importar }
          </button>
        }

        @if (resultado) {
          <div class="result-box" [class.error]="resultado.errores?.length">
            <h4>Importación completada</h4>
            <p>{{ resultado.insertados }} creados &middot; {{ resultado.actualizados }} actualizados</p>
            @if (resultado.errores?.length) {
              <ul>@for (e of resultado.errores; track e) { <li>{{ e }}</li> }</ul>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class ImportDataComponent {
  tipo: 'productos' | 'servicios' | 'combinado' = 'productos';
  file: File | null = null;
  dragover = false;
  subiendo = false;
  excludeFood = true;
  resultado: { insertados: number; actualizados: number; errores?: string[] } | null = null;

  constructor(private api: ApiService) {}

  onDrop(e: DragEvent) {
    e.preventDefault();
    this.dragover = false;
    const f = e.dataTransfer?.files?.[0];
    if (f && (f.name.endsWith('.csv') || f.name.endsWith('.xlsx'))) this.file = f;
  }

  onFileSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files?.[0]) this.file = input.files[0];
  }

  limpiar() {
    this.file = null;
    this.resultado = null;
  }

  subir() {
    if (!this.file) return;
    this.subiendo = true;
    this.resultado = null;

    const fd = new FormData();
    fd.append('archivo', this.file);
    fd.append('tipo', this.tipo);
    fd.append('excludeFood', this.excludeFood ? 'true' : 'false');

    this.api.post('/admin/import', fd).subscribe({
      next: (res: any) => {
        this.resultado = res;
        this.subiendo = false;
        this.api.invalidate();
      },
      error: (err) => {
        this.resultado = { insertados: 0, actualizados: 0, errores: [err?.error?.error || 'Error al procesar el archivo'] };
        this.subiendo = false;
      }
    });
  }
}
