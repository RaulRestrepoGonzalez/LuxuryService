import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const FROM_EMAIL = process.env.SMTP_FROM || 'notificaciones@luxuryservice.co';
const FROM_NAME = process.env.SMTP_FROM_NAME || 'Luxury Service Manga';

const BASE_URL = process.env.BASE_URL || 'http://localhost:4200';

const transporter = SMTP_HOST
  ? nodemailer.createTransport({ host: SMTP_HOST, port: SMTP_PORT, secure: SMTP_PORT === 465, auth: { user: SMTP_USER, pass: SMTP_PASS } })
  : null;

export async function enviarTicketCita(params: {
  to: string;
  nombre: string;
  servicio: string;
  fecha: string;
  horario: string;
  precioTotal: number;
  reference: string;
  checkoutUrl: string;
  qrBase64: string;
}) {
  const horaLegible = params.horario === '10:00' ? '10:00 a.m.' : params.horario === '14:00' ? '2:00 p.m.' : params.horario;
  const totalFormateado = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(params.precioTotal);

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0;">
<div style="max-width: 600px; margin: 0 auto; background: #fff;">
<div style="background: #0a0a0a; padding: 2rem; text-align: center;">
<h1 style="color: #ff2b2b; margin: 0; font-size: 1.5rem; letter-spacing: 0.1em;">LUXURY SERVICE MANGA</h1>
<p style="color: rgba(255,255,255,0.6); margin: 0.25rem 0 0; font-size: 0.85rem;">Detailing Automotriz Premium · Manga, Cartagena</p>
</div>
<div style="padding: 2rem;">
<h2 style="margin: 0 0 1rem; font-size: 1.2rem; color: #0a0a0a;">¡Cita agendada con éxito!</h2>
<p style="color: #555; line-height: 1.6;">Hola <strong>${params.nombre}</strong>, hemos recibido tu reserva en Luxury Service. Estos son los detalles:</p>
<table style="width: 100%; border-collapse: collapse; margin: 1.25rem 0;">
<tr><td style="padding: 0.75rem; border-bottom: 1px solid #eee; color: #888;">Servicio</td><td style="padding: 0.75rem; border-bottom: 1px solid #eee; font-weight: 600; color: #0a0a0a;">${params.servicio}</td></tr>
<tr><td style="padding: 0.75rem; border-bottom: 1px solid #eee; color: #888;">Fecha</td><td style="padding: 0.75rem; border-bottom: 1px solid #eee; font-weight: 600; color: #0a0a0a;">${params.fecha}</td></tr>
<tr><td style="padding: 0.75rem; border-bottom: 1px solid #eee; color: #888;">Horario</td><td style="padding: 0.75rem; border-bottom: 1px solid #eee; font-weight: 600; color: #0a0a0a;">${horaLegible}</td></tr>
<tr><td style="padding: 0.75rem; border-bottom: 1px solid #eee; color: #888;">Total a pagar</td><td style="padding: 0.75rem; border-bottom: 1px solid #eee; font-weight: 700; color: #ff2b2b; font-size: 1.1rem;">${totalFormateado}</td></tr>
<tr><td style="padding: 0.75rem; border-bottom: 1px solid #eee; color: #888;">Referencia</td><td style="padding: 0.75rem; border-bottom: 1px solid #eee; font-weight: 600; color: #555; font-family: monospace;">${params.reference}</td></tr>
</table>
<p style="color: #555; line-height: 1.6;">Para confirmar tu cita, realiza el pago del servicio escaneando el código QR o haciendo clic en el botón:</p>
<div style="text-align: center; margin: 1.5rem 0;">
<img src="cid:qr" alt="QR de pago" style="width: 200px; height: 200px; border-radius: 1rem; border: 2px solid #eee;" />
</div>
<div style="text-align: center; margin: 1.5rem 0;">
<a href="${params.checkoutUrl}" style="display: inline-block; background: #ff2b2b; color: #000; font-weight: 700; padding: 0.85rem 2rem; border-radius: 999px; text-decoration: none; font-size: 1rem;">Pagar ahora</a>
</div>
<p style="color: #888; font-size: 0.85rem; line-height: 1.5;">Incluye recargo de $10,000 COP por reserva en línea. IVA incluido donde aplique.</p>
</div>
<div style="background: #f9f9f9; padding: 1.25rem 2rem; text-align: center; border-top: 1px solid #eee;">
<p style="color: #888; font-size: 0.8rem; margin: 0;">Av. Principal Manga, Cartagena, Colombia<br>Tel: (605) 300 123 4567</p>
</div>
</div>
</body>
</html>`;

  const text = `Hola ${params.nombre},\n\nTu cita de ${params.servicio} ha sido agendada para el ${params.fecha} a las ${horaLegible}.\n\nTotal a pagar: ${totalFormateado} (incluye $10,000 COP recargo por reserva en línea)\nReferencia: ${params.reference}\n\nPara pagar visita: ${params.checkoutUrl}\n\nLuxury Service Manga - Manga, Cartagena`;

  if (!transporter) {
    console.log(`[EMAIL SIMULADO] Para: ${params.to} | Asunto: Ticket de cita - ${params.servicio}`);
    console.log(`[EMAIL SIMULADO] QR: data:image/png;base64,${params.qrBase64.substring(0, 40)}...`);
    console.log(`[EMAIL SIMULADO] URL pago: ${params.checkoutUrl}`);
    return;
  }

  await transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: params.to,
    subject: `Ticket de cita - ${params.servicio} - Luxury Service`,
    text,
    html,
    attachments: [{
      filename: 'qr-pago.png',
      content: Buffer.from(params.qrBase64, 'base64'),
      cid: 'qr'
    }]
  });
}

export async function enviarConfirmacionPago(params: {
  to: string;
  nombre: string;
  servicio: string;
  fecha: string;
  horario: string;
  reference: string;
}) {
  const horaLegible = params.horario === '10:00' ? '10:00 a.m.' : params.horario === '14:00' ? '2:00 p.m.' : params.horario;

  const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0;">
<div style="max-width: 600px; margin: 0 auto; background: #fff;">
<div style="background: #0a0a0a; padding: 2rem; text-align: center;">
<h1 style="color: #ff2b2b; margin: 0; font-size: 1.5rem; letter-spacing: 0.1em;">LUXURY SERVICE MANGA</h1>
</div>
<div style="padding: 2rem;">
<h2 style="margin: 0 0 1rem; font-size: 1.2rem; color: #0a0a0a;">✅ Pago confirmado</h2>
<p style="color: #555; line-height: 1.6;">Hola <strong>${params.nombre}</strong>, tu pago ha sido recibido. Tu cita está confirmada.</p>
<p style="color: #555;"><strong>${params.servicio}</strong> — ${params.fecha} a las ${horaLegible}</p>
<p style="color: #888; font-size: 0.85rem;">Ref: ${params.reference}</p>
</div>
</div>
</body>
</html>`;

  if (!transporter) {
    console.log(`[EMAIL SIMULADO] Confirmación pago para: ${params.to}`);
    return;
  }

  await transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: params.to,
    subject: `✅ Pago confirmado - ${params.servicio} - Luxury Service`,
    html
  });
}
