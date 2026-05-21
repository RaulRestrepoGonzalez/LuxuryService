import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminGuard } from 'src/app/core/guards/admin.guard';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { AppointmentsMgmtComponent } from './pages/appointments-mgmt/appointments-mgmt.component';
import { InventoryMgmtComponent } from './pages/inventory-mgmt/inventory-mgmt.component';
import { ServicesMgmtComponent } from './pages/services-mgmt/services-mgmt.component';

const routes: Routes = [
  { path: 'dashboard', component: DashboardComponent, canActivate: [AdminGuard] },
  { path: 'citas', component: AppointmentsMgmtComponent, canActivate: [AdminGuard] },
  { path: 'inventario', component: InventoryMgmtComponent, canActivate: [AdminGuard] },
  { path: 'servicios', component: ServicesMgmtComponent, canActivate: [AdminGuard] }
];

@NgModule({ imports: [RouterModule.forChild(routes)], exports: [RouterModule] })
export class AdminRoutingModule { }
