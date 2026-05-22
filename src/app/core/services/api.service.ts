import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { environment } from 'src/environments/environment';
import { Observable, of, throwError } from 'rxjs';
import { tap, catchError, timeout } from 'rxjs/operators';

interface CacheEntry { value: any; expiry: number; }

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = environment.apiUrl;
  private cache = new Map<string, CacheEntry>();
  private cacheTtl = 300_000;
  private persistentTtl = 600_000;
  private platformId = inject(PLATFORM_ID);
  private persistentKeys = new Set(['/services/catalog', '/services', '/products']);

  constructor(private http: HttpClient) {
    if (isPlatformBrowser(this.platformId)) {
      for (const key of this.persistentKeys) {
        try {
          const raw = localStorage.getItem(`api:${key}`);
          if (raw) {
            const entry = JSON.parse(raw) as CacheEntry;
            if (entry.expiry > Date.now()) this.cache.set(key, entry);
            else localStorage.removeItem(`api:${key}`);
          }
        } catch { /* ignore */ }
      }
    }
  }

  get<T>(endpoint: string, ttl?: number, cacheKey?: string): Observable<T> {
    const key = cacheKey || endpoint;
    const now = Date.now();
    const entry = this.cache.get(key);
    if (entry && entry.expiry > now) return of(entry.value as T);

    return this.http.get<T>(`${this.baseUrl}${endpoint}`).pipe(
      timeout(8_000),
      tap(value => {
        if (ttl === 0) return;
        const expiry = now + (ttl ?? this.cacheTtl);
        this.cache.set(key, { value, expiry });
      }),
      catchError(err => {
        this.cache.delete(key);
        console.error('[API GET] Error:', err instanceof HttpErrorResponse ? err.status : err);
        return throwError(() => err);
      })
    );
  }

  invalidate(key?: string) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
      if (isPlatformBrowser(this.platformId)) {
        for (const k of this.persistentKeys) localStorage.removeItem(`api:${k}`);
      }
    }
  }

  post<T>(endpoint: string, body: any): Observable<T> {
    this.cache.delete(endpoint.replace(/^\//, ''));
    this.cache.delete('citas');
    return this.http.post<T>(`${this.baseUrl}${endpoint}`, body).pipe(
      timeout(8_000),
      catchError(err => {
        console.error('[API POST] Error:', err instanceof HttpErrorResponse ? err.status : err);
        return throwError(() => err);
      })
    );
  }
  put<T>(endpoint: string, body: any): Observable<T> {
    this.cache.delete(endpoint.replace(/^\//, ''));
    this.cache.delete('citas');
    return this.http.put<T>(`${this.baseUrl}${endpoint}`, body).pipe(
      timeout(8_000),
      catchError(err => {
        console.error('[API PUT] Error:', err instanceof HttpErrorResponse ? err.status : err);
        return throwError(() => err);
      })
    );
  }
  delete<T>(endpoint: string): Observable<T> {
    this.cache.delete(endpoint.replace(/^\//, ''));
    this.cache.delete('citas');
    return this.http.delete<T>(`${this.baseUrl}${endpoint}`).pipe(
      timeout(8_000),
      catchError(err => {
        console.error('[API DELETE] Error:', err instanceof HttpErrorResponse ? err.status : err);
        return throwError(() => err);
      })
    );
  }
}
