import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { TERMINOS_VERSION, POLITICA_VERSION } from '../constants/legal.constants';

export interface AuthUser {
  id: string;
  nombre: string;
  email: string;
  rol: string;
}

export interface EmailCheckResult {
  exists: boolean;
  nombre: string | null;
  rol: string | null;
  isAdmin: boolean;
  requiresPassword: boolean;
}

export interface ClientRegisterPayload {
  nombre: string;
  email: string;
  aceptaTerminos: boolean;
  consentimientoDatos: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private tokenKey = 'luxury_token';
  private userKey = 'luxury_user';
  private currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
  readonly currentUser$ = this.currentUserSubject.asObservable();

  constructor(private api: ApiService) {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(this.userKey) : null;
    if (stored) this.currentUserSubject.next(JSON.parse(stored));
  }

  checkEmail(email: string): Observable<EmailCheckResult> {
    return this.api.get<EmailCheckResult>(`/auth/check-email?email=${encodeURIComponent(email.trim().toLowerCase())}`);
  }

  adminLogin(email: string, password: string): Observable<{ token: string; user: AuthUser }> {
    return this.api.post<{ token: string; user: AuthUser }>('/auth/login', { email: email.trim().toLowerCase(), password }).pipe(
      tap(res => this.persistSession(res.token, res.user))
    );
  }

  clientAccess(email: string): Observable<{ token: string; user: AuthUser }> {
    return this.api.post<{ token: string; user: AuthUser }>('/auth/client-access', { email: email.trim().toLowerCase() }).pipe(
      tap(res => this.persistSession(res.token, res.user))
    );
  }

  clientRegister(payload: ClientRegisterPayload): Observable<{ token: string; user: AuthUser }> {
    return this.api.post<{ token: string; user: AuthUser }>('/auth/client-register', {
      nombre: payload.nombre.trim(),
      email: payload.email.trim().toLowerCase(),
      aceptaTerminos: payload.aceptaTerminos,
      consentimientoDatos: payload.consentimientoDatos,
      versionTerminos: TERMINOS_VERSION,
      versionPolitica: POLITICA_VERSION
    }).pipe(tap(res => this.persistSession(res.token, res.user)));
  }

  /** @deprecated usar adminLogin o clientAccess */
  login(email: string, password: string) { return this.adminLogin(email, password); }

  forceAdminSession(user: AuthUser) {
    this.persistSession('local-fallback-token', user);
  }

  revokeConsent(): Observable<{ success: boolean; message: string }> {
    return this.api.post('/auth/revoke-consent', {});
  }

  logout() {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);
    }
    this.currentUserSubject.next(null);
  }

  getToken(): string | null {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(this.tokenKey) : null;
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  isAdmin(): boolean {
    const u = this.getCurrentUser();
    return !!u && u.rol === 'admin';
  }

  private persistSession(token: string, user: AuthUser) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.tokenKey, token);
      localStorage.setItem(this.userKey, JSON.stringify(user));
    }
    this.currentUserSubject.next(user);
  }
}
