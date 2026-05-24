import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { ServicesCatalogComponent } from './pages/services-catalog/services-catalog.component';
import { ShopComponent } from './pages/shop/shop.component';
import { BookAppointmentComponent } from './pages/book-appointment/book-appointment.component';
import { AuthComponent } from './pages/auth/auth.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { CotizacionComponent } from './pages/cotizacion/cotizacion.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'servicios', component: ServicesCatalogComponent },
  { path: 'cotizar', component: CotizacionComponent },
  { path: 'tienda', component: ShopComponent },
  { path: 'agendar-cita', component: BookAppointmentComponent },
  { path: 'acceso', component: AuthComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent }
];

@NgModule({ imports: [RouterModule.forChild(routes)], exports: [RouterModule] })
export class PublicRoutingModule { }
