import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { PublicRoutingModule } from './public-routing.module';
import { HomeComponent } from './pages/home/home.component';
import { ServicesCatalogComponent } from './pages/services-catalog/services-catalog.component';
import { ShopComponent } from './pages/shop/shop.component';
import { BookAppointmentComponent } from './pages/book-appointment/book-appointment.component';
import { AuthComponent } from './pages/auth/auth.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { CotizacionComponent } from './pages/cotizacion/cotizacion.component';
import { GiftCardComponent } from './pages/gift-card/gift-card.component';

@NgModule({
  imports: [CommonModule, PublicRoutingModule, ReactiveFormsModule, HomeComponent, ServicesCatalogComponent, ShopComponent, BookAppointmentComponent, AuthComponent, LoginComponent, RegisterComponent, CotizacionComponent, GiftCardComponent]
})
export class PublicModule { }
