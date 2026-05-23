import { ObjectId } from 'mongodb';
import { getDb } from './db.js';
import { enviarNotificacionGeneral } from './email.js';

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
  const mensaje = `Tu cita de ${servicioNombre} quedó agendada para el ${fecha} a las ${horaLabel}. Realiza el pago para confirmar.${ref}\n\n📍 Llega 10 minutos antes para realizar el pago en el local y recibir la revisión inicial de tu vehículo.\n🔧 El valor final puede variar según el estado y tipo del vehículo. Nuestro equipo evaluará tu auto al llegar.\n\n⏱ Tienes 10 minutos para pagar. Por el alto flujo de clientes, un espacio apartado sin pago es un ingreso que dejamos de percibir. Si no pagas a tiempo, la reserva expira automáticamente.`;
  await Promise.all([
    crearNotificacion({ usuarioId, email, tipo: 'cita', titulo: 'Cita agendada — pendiente de pago', mensaje }),
    enviarNotificacionGeneral({
      to: email,
      nombre: email.split('@')[0],
      asunto: `Cita agendada - ${servicioNombre} - Luxury Service`,
      titulo: 'Cita agendada',
      mensaje
    }).catch(e => console.error('Error enviando email de cita:', e))
  ]);
}

export async function notificarBienvenidaCliente(usuarioId: string, email: string) {
  const mensaje = 'Recibirás aquí promociones exclusivas y confirmaciones de tus citas. ¡Agenda tu primer servicio con 10% de bienvenida este mes!';
  await Promise.all([
    crearNotificacion({ usuarioId, email, tipo: 'promocion', titulo: 'Bienvenido a Luxury Service', mensaje }),
    enviarNotificacionGeneral({
      to: email,
      nombre: email.split('@')[0],
      asunto: '¡Bienvenido a Luxury Service Manga!',
      titulo: 'Bienvenido a Luxury Service',
      mensaje
    }).catch(e => console.error('Error enviando email de bienvenida:', e))
  ]);
}
