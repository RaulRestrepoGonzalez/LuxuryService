import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { environment } from 'src/environments/environment';
import { Observable, of, throwError, Subject } from 'rxjs';
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
  private refreshing = new Set<string>();
  private refreshSubject = new Subject<{ key: string; value: any }>();
  readonly refresh$ = this.refreshSubject.asObservable();

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

  /** Returns cached data instantly (even if stale) and refreshes in background.
   *  Only shows loading when there is genuinely no data at all. */
  get<T>(endpoint: string, ttl?: number, cacheKey?: string): Observable<T> {
    const key = cacheKey || endpoint;
    const now = Date.now();
    const entry = this.cache.get(key);
    const effectiveTtl = ttl ?? this.cacheTtl;

    if (entry) {
      if (entry.expiry <= now && !this.refreshing.has(key)) {
        this.refreshInBackground(key, endpoint);
      }
      return of(entry.value as T);
    }

    return this.http.get<T>(`${this.baseUrl}${endpoint}`).pipe(
      timeout(8_000),
      tap(value => {
        const expiry = now + effectiveTtl;
        this.cache.set(key, { value, expiry });
      }),
      catchError(err => {
        console.error('[API GET] Error:', err instanceof HttpErrorResponse ? err.status : err);
        return throwError(() => err);
      })
    );
  }

  getFresh<T>(endpoint: string, cacheKey?: string): Observable<T> {
    const key = cacheKey || endpoint;
    this.cache.delete(key);
    return this.get<T>(endpoint, 0, cacheKey);
  }

  private refreshInBackground(key: string, endpoint: string) {
    this.refreshing.add(key);
    this.http.get(`${this.baseUrl}${endpoint}`).pipe(timeout(8_000)).subscribe({
      next: value => {
        const expiry = Date.now() + (key.startsWith('/appointments') ? 120_000 : this.cacheTtl);
        this.cache.set(key, { value, expiry });
        this.refreshing.delete(key);
        this.refreshSubject.next({ key, value });
      },
      error: () => {
        this.refreshing.delete(key);
      }
    });
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
    this.invalidateMutations();
    return this.http.post<T>(`${this.baseUrl}${endpoint}`, body).pipe(
      timeout(8_000),
      catchError(err => {
        console.error('[API POST] Error:', err instanceof HttpErrorResponse ? err.status : err);
        return throwError(() => err);
      })
    );
  }
  put<T>(endpoint: string, body: any): Observable<T> {
    this.invalidateMutations();
    return this.http.put<T>(`${this.baseUrl}${endpoint}`, body).pipe(
      timeout(8_000),
      catchError(err => {
        console.error('[API PUT] Error:', err instanceof HttpErrorResponse ? err.status : err);
        return throwError(() => err);
      })
    );
  }
  delete<T>(endpoint: string): Observable<T> {
    this.invalidateMutations();
    return this.http.delete<T>(`${this.baseUrl}${endpoint}`).pipe(
      timeout(8_000),
      catchError(err => {
        console.error('[API DELETE] Error:', err instanceof HttpErrorResponse ? err.status : err);
        return throwError(() => err);
      })
    );
  }

  private invalidateMutations() {
    for (const [key, entry] of this.cache) {
      this.cache.set(key, { value: entry.value, expiry: 0 });
    }
  }
}
