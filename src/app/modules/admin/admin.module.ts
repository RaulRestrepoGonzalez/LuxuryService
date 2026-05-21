import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { AdminRoutingModule } from './admin-routing.module';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { AppointmentsMgmtComponent } from './pages/appointments-mgmt/appointments-mgmt.component';
import { InventoryMgmtComponent } from './pages/inventory-mgmt/inventory-mgmt.component';
import { ServicesMgmtComponent } from './pages/services-mgmt/services-mgmt.component';

@NgModule({
  imports: [CommonModule, AdminRoutingModule, ReactiveFormsModule, DashboardComponent, AppointmentsMgmtComponent, InventoryMgmtComponent, ServicesMgmtComponent]
})
export class AdminModule { }
