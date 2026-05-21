import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from 'src/app/core/services/api.service';

@Component({
  selector: 'app-my-appointments',
  standalone: true,
  imports: [CommonModule],
  template: `<h2>Mis Citas</h2><ul><li *ngFor="let cita of citas">{{cita.fecha}} - {{cita.horario}} - {{cita.servicio_nombre}} ({{cita.estado}}) <button *ngIf="cita.estado==='pendiente'" (click)="cancelar(cita.id)">Cancelar</button></li></ul>`
})
export class MyAppointmentsComponent implements OnInit {
  citas: any[] = [];
  constructor(private api: ApiService) {}
  ngOnInit() {
    if (typeof window !== 'undefined') {
      this.api.get('/appointments/my').subscribe(res => this.citas = res as any[]);
    }
  }
  cancelar(id: number) { this.api.put(`/appointments/${id}/cancel`, {}).subscribe(() => this.ngOnInit()); }
}
