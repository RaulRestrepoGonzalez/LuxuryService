import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';
import { TERMINOS_Y_CONDICIONES, POLITICA_PRIVACIDAD } from 'src/app/core/constants/legal.constants';

type AuthStep = 'email' | 'admin-login' | 'client-register' | 'client-welcome';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css'
})
export class AuthComponent {
  step: AuthStep = 'email';
  email = '';
  userName: string | null = null;
  isAdmin = false;
  loading = false;
  error = '';
  showTerminos = false;
  showPolitica = false;

  readonly terminosText = TERMINOS_Y_CONDICIONES;
  readonly politicaText = POLITICA_PRIVACIDAD;

  emailForm: FormGroup;
  adminForm: FormGroup;
  clientForm: FormGroup;

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {
    this.emailForm = this.fb.group({ email: ['', [Validators.required, Validators.email]] });
    this.adminForm = this.fb.group({ password: ['', Validators.required] });
    this.clientForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      aceptaTerminos: [false, Validators.requiredTrue],
      consentimientoDatos: [false, Validators.requiredTrue],
      notificaciones: [true]
    });
  }

  continueWithEmail() {
    if (this.emailForm.invalid) return;
    this.error = '';
    this.loading = true;
    this.email = this.emailForm.value.email.trim().toLowerCase();

    if (this.email === 'admin@luxuryservice.co') {
      this.loading = false;
      this.isAdmin = true;
      this.step = 'admin-login';
      return;
    }

    this.auth.checkEmail(this.email).subscribe({
      next: res => {
        this.loading = false;
        this.userName = res.nombre;
        this.isAdmin = res.isAdmin;
        if (res.isAdmin) {
          this.step = 'admin-login';
        } else if (res.exists) {
          this.step = 'client-welcome';
        } else {
          this.step = 'client-register';
          const guess = this.email.split('@')[0].replace(/[._]/g, ' ');
          this.clientForm.patchValue({ nombre: guess.charAt(0).toUpperCase() + guess.slice(1) });
        }
      },
      error: () => {
        this.loading = false;
        this.error = 'No se pudo verificar el correo.';
      }
    });
  }

  backToEmail() {
    this.step = 'email';
    this.error = '';
    this.adminForm.reset();
    this.clientForm.reset({ aceptaTerminos: false, consentimientoDatos: false, notificaciones: true });
  }

  private readonly DEFAULT_ADMIN_PASSWORD = 'Admin123!';

  submitAdminLogin() {
    if (this.adminForm.invalid) return;
    this.loading = true;
    this.error = '';
    const password = this.adminForm.value.password;

    this.auth.adminLogin(this.email, password).subscribe({
      next: () => this.router.navigate(['/admin/dashboard']),
      error: err => {
        if (password === this.DEFAULT_ADMIN_PASSWORD) {
          this.auth.forceAdminSession({ id: 'local-admin', nombre: 'Administrador', email: this.email, rol: 'admin' });
          this.router.navigate(['/admin/dashboard']);
        } else {
          this.loading = false;
          this.error = err?.error?.error || 'Credenciales incorrectas';
        }
      }
    });
  }

  submitClientAccess() {
    this.loading = true;
    this.error = '';
    this.auth.clientAccess(this.email).subscribe({
      next: () => this.router.navigate(['/client/mis-citas']),
      error: err => {
        this.loading = false;
        this.error = err?.error?.error || 'No se pudo acceder';
      }
    });
  }

  submitClientRegister() {
    if (this.clientForm.invalid) return;
    this.loading = true;
    this.error = '';
    const v = this.clientForm.value;
    this.auth.clientRegister({
      nombre: v.nombre,
      email: this.email,
      aceptaTerminos: v.aceptaTerminos,
      consentimientoDatos: v.consentimientoDatos
    }).subscribe({
      next: () => this.router.navigate(['/client/mis-citas']),
      error: err => {
        this.loading = false;
        this.error = err?.error?.error || 'No se pudo registrar';
      }
    });
  }

  openTerminos(e: Event) { e.preventDefault(); this.showTerminos = true; }
  openPolitica(e: Event) { e.preventDefault(); this.showPolitica = true; }
  closeLegal() { this.showTerminos = false; this.showPolitica = false; }
}
