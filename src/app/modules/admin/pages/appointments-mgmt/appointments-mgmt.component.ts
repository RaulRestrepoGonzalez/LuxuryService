import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from 'src/app/core/services/api.service';

@Component({
  selector: 'app-appointments-mgmt',
  standalone: true,
  imports: [CommonModule],
  template: `<h2>Gestión de Citas</h2><ul><li *ngFor="let c of citas">{{c.fecha}} {{c.horario}} - {{c.cliente_nombre}} ({{c.estado}}) <select (change)="cambiarEstado(c.id, $event)"><option>pendiente</option><option>confirmada</option><option>completada</option><option>cancelada</option></select></li></ul>`
})
export class AppointmentsMgmtComponent implements OnInit {
  citas: any[] = [];
  constructor(private api: ApiService) {}
  ngOnInit() {
    if (typeof window !== 'undefined') {
      this.api.get('/admin/appointments').subscribe(res => this.citas = res as any[]);
    }
  }
  cambiarEstado(id: number, event: any) { this.api.put(`/admin/appointments/${id}/status`, { estado: event.target.value }).subscribe(() => this.ngOnInit()); }
}
