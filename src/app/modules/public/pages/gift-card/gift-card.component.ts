import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';

interface GiftCardOption {
  value: number;
  label: string;
  desc: string;
  highlight: string;
  color: string;
}

@Component({
  selector: 'app-gift-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './gift-card.component.html',
  styleUrl: './gift-card.component.css'
})
export class GiftCardComponent {
  constructor(public auth: AuthService) {}

  options: GiftCardOption[] = [
    {
      value: 80000,
      label: 'Clásica',
      desc: 'Perfecto para un lavado premium o un detalle básico',
      highlight: 'Lavado + Toallas',
      color: '#0a0a0a'
    },
    {
      value: 140000,
      label: 'Premium',
      desc: 'Ideal para un detailing completo o varios servicios',
      highlight: 'Detailing + Cera',
      color: '#ff2b2b'
    },
    {
      value: 200000,
      label: 'Black Label',
      desc: 'La mejor experiencia: tratamiento completo anticorrosivo + detailing',
      highlight: 'Full Treatment',
      color: '#d4af37'
    }
  ];

  comprar(opcion: GiftCardOption) {
    if (!this.auth.isLoggedIn()) {
      alert('Inicia sesión para comprar una tarjeta de regalo');
      return;
    }
    alert(`Redirigiendo al pago de la Gift Card ${opcion.label} por ${this.formatPrice(opcion.value)}...`);
  }

  formatPrice(n: number) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
  }
}
