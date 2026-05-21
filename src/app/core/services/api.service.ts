import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable, of } from 'rxjs';
import { tap, catchError, timeout } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = environment.apiUrl;
  private cache = new Map<string, { value: any; expiry: number }>();
  private cacheTtl = 60_000;

  constructor(private http: HttpClient) {}

  get<T>(endpoint: string, ttl?: number): Observable<T> {
    const key = `GET:${endpoint}`;
    const now = Date.now();
    const entry = this.cache.get(key);
    if (entry && entry.expiry > now) return of(entry.value as T);

    return this.http.get<T>(`${this.baseUrl}${endpoint}`).pipe(
      timeout(8_000),
      tap(value => this.cache.set(key, { value, expiry: now + (ttl ?? this.cacheTtl) })),
      catchError(err => {
        this.cache.delete(key);
        throw err;
      })
    );
  }

  invalidate(endpoint?: string) {
    if (endpoint) {
      this.cache.delete(`GET:${endpoint}`);
      this.cache.delete(`POST:${endpoint}`);
      this.cache.delete(`PUT:${endpoint}`);
      this.cache.delete(`DELETE:${endpoint}`);
    } else {
      this.cache.clear();
    }
  }

  post<T>(endpoint: string, body: any): Observable<T> {
    this.cache.delete(`GET:${endpoint}`);
    return this.http.post<T>(`${this.baseUrl}${endpoint}`, body).pipe(timeout(8_000));
  }
  put<T>(endpoint: string, body: any): Observable<T> {
    this.cache.delete(`GET:${endpoint}`);
    return this.http.put<T>(`${this.baseUrl}${endpoint}`, body).pipe(timeout(8_000));
  }
  delete<T>(endpoint: string): Observable<T> {
    this.cache.delete(`GET:${endpoint}`);
    return this.http.delete<T>(`${this.baseUrl}${endpoint}`).pipe(timeout(8_000));
  }
}
