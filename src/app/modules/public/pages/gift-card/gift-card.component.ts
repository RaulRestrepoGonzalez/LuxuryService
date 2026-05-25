import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';
import { ApiService } from 'src/app/core/services/api.service';

interface GiftCardOption {
  value: number;
  label: string;
  desc: string;
  highlight: string;
  color: string;
}

interface PaymentResponse {
  url: string;
  reference: string;
  amount: number;
  qr: string;
}

@Component({
  selector: 'app-gift-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './gift-card.component.html',
  styleUrl: './gift-card.component.css'
})
export class GiftCardComponent {
  paying = false;
  payment: PaymentResponse | null = null;
  paymentError = '';

  constructor(
    public auth: AuthService,
    private api: ApiService
  ) {}

  options: GiftCardOption[] = [
    {
      value: 50000,
      label: 'Express',
      desc: 'Ideal para un lavado express o un detalle rápido',
      highlight: 'Lavado Express',
      color: '#2e7d32'
    },
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
    this.paying = true;
    this.paymentError = '';
    this.payment = null;
    this.api.post<{ success: boolean; payment: PaymentResponse }>('/gift-cards/purchase', {
      monto: opcion.value,
      etiqueta: opcion.label
    }).subscribe({
      next: res => {
        this.paying = false;
        this.payment = res.payment;
        if (res.payment?.url) {
          window.location.href = res.payment.url;
        }
      },
      error: err => {
        this.paying = false;
        this.paymentError = err?.error?.error || 'Error al iniciar el pago';
      }
    });
  }

  formatPrice(n: number) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
  }
}
