import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from 'src/app/core/services/api.service';

@Injectable({ providedIn: 'root' })
export class ProductsResolver implements Resolve<any[]> {
  constructor(private api: ApiService) {}

  resolve(_route: ActivatedRouteSnapshot, _state: RouterStateSnapshot): Observable<any[]> {
    return this.api.getFresh<any[]>('/products').pipe(
      catchError(() => of([]))
    );
  }
}
