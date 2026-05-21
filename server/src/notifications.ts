import { ObjectId } from 'mongodb';
import { getDb } from './db.js';

export async function crearNotificacion(data: {
  usuarioId: string;
  email: string;
  tipo: 'promocion' | 'cita' | 'sistema';
  titulo: string;
  mensaje: string;
}) {
  await getDb().collection('notificaciones').insertOne({
    usuario_id: new ObjectId(data.usuarioId),
    email: data.email,
    tipo: data.tipo,
    titulo: data.titulo,
    mensaje: data.mensaje,
    leida: false,
    created_at: new Date()
  });
}

export async function notificarCitaAgendada(usuarioId: string, email: string, servicioNombre: string, fecha: string, horario: string, reference?: string) {
  const horaLabel = horario === '10:00' ? '10:00 a.m.' : horario === '14:00' ? '2:00 p.m.' : horario;
  const ref = reference ? ` (Ref: ${reference})` : '';
  await crearNotificacion({
    usuarioId,
    email,
    tipo: 'cita',
    titulo: 'Cita agendada — pendiente de pago',
    mensaje: `Tu cita de ${servicioNombre} quedó agendada para el ${fecha} a las ${horaLabel}. Realiza el pago para confirmar.${ref}`
  });
}

export async function notificarBienvenidaCliente(usuarioId: string, email: string) {
  await crearNotificacion({
    usuarioId,
    email,
    tipo: 'promocion',
    titulo: 'Bienvenido a Luxury Service',
    mensaje: 'Recibirás aquí promociones exclusivas y confirmaciones de tus citas. ¡Agenda tu primer servicio con 10% de bienvenida este mes!'
  });
}
