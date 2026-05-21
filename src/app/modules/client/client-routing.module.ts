import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from 'src/app/core/guards/auth.guard';
import { MyAppointmentsComponent } from './pages/my-appointments/my-appointments.component';
import { MyProductsComponent } from './pages/my-products/my-products.component';
import { ProfileComponent } from './pages/profile/profile.component';

const routes: Routes = [
  { path: 'mis-citas', component: MyAppointmentsComponent, canActivate: [AuthGuard] },
  { path: 'mis-productos', component: MyProductsComponent, canActivate: [AuthGuard] },
  { path: 'perfil', component: ProfileComponent, canActivate: [AuthGuard] }
];

@NgModule({ imports: [RouterModule.forChild(routes)], exports: [RouterModule] })
export class ClientRoutingModule { }
