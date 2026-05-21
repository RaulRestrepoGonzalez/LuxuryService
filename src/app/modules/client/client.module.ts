import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClientRoutingModule } from './client-routing.module';
import { MyAppointmentsComponent } from './pages/my-appointments/my-appointments.component';
import { MyProductsComponent } from './pages/my-products/my-products.component';
import { ProfileComponent } from './pages/profile/profile.component';

@NgModule({
  imports: [CommonModule, ClientRoutingModule, MyAppointmentsComponent, MyProductsComponent, ProfileComponent]
})
export class ClientModule { }
