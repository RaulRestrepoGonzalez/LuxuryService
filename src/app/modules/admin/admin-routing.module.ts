import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminGuard } from 'src/app/core/guards/admin.guard';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { AppointmentsMgmtComponent } from './pages/appointments-mgmt/appointments-mgmt.component';
import { InventoryMgmtComponent } from './pages/inventory-mgmt/inventory-mgmt.component';

import { EmailSettingsComponent } from './pages/email-settings/email-settings.component';
import { ImportDataComponent } from './pages/import-data/import-data.component';

const routes: Routes = [
  { path: 'dashboard', component: DashboardComponent, canActivate: [AdminGuard] },
  { path: 'citas', component: AppointmentsMgmtComponent, canActivate: [AdminGuard] },
  { path: 'inventario', component: InventoryMgmtComponent, canActivate: [AdminGuard] },
  { path: 'servicios', redirectTo: 'inventario', pathMatch: 'full' },
  { path: 'importar', component: ImportDataComponent, canActivate: [AdminGuard] },
  { path: 'email-settings', component: EmailSettingsComponent, canActivate: [AdminGuard] }
];

@NgModule({ imports: [RouterModule.forChild(routes)], exports: [RouterModule] })
export class AdminRoutingModule { }
