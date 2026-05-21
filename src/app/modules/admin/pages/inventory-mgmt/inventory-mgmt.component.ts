import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ApiService } from 'src/app/core/services/api.service';

@Component({
  selector: 'app-inventory-mgmt',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `<h2>Inventario</h2><ul><li *ngFor="let p of productos">{{p.nombre}} - Stock: {{p.stock}} - Precio: {{p.precio}} <button (click)="editar(p)">Editar</button></li></ul><form [formGroup]="productoForm" (ngSubmit)="agregar()"><input formControlName="nombre" placeholder="Nombre"><input formControlName="precio" placeholder="Precio"><input formControlName="stock" placeholder="Stock"><button>Agregar</button></form>`
})
export class InventoryMgmtComponent implements OnInit {
  productos: any[] = [];
  productoForm: FormGroup;
  constructor(private api: ApiService, private fb: FormBuilder) {
    this.productoForm = this.fb.group({ nombre: '', precio: 0, stock: 0, categoria: '' });
  }
  ngOnInit() {
    if (typeof window !== 'undefined') {
      this.api.get('/admin/products').subscribe(res => this.productos = res as any[]);
    }
  }
  agregar() { this.api.post('/admin/products', this.productoForm.value).subscribe(() => this.ngOnInit()); }
  editar(p: any) { const nuevoStock = prompt('Nuevo stock', p.stock); if (nuevoStock) this.api.put(`/admin/products/${p.id}`, { stock: nuevoStock, precio: p.precio }).subscribe(() => this.ngOnInit()); }
}
