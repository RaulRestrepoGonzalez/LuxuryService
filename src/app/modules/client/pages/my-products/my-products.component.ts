import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-my-products',
  standalone: true,
  imports: [CommonModule],
  template: `<h2>Mis Productos</h2><p>Próximamente</p>`
})
export class MyProductsComponent { }
