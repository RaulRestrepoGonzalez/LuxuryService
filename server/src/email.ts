import nodemailer from 'nodemailer';
import { getDb } from './db.js';

const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const FROM_EMAIL = process.env.SMTP_FROM || 'notificaciones@luxuryservice.co';
const FROM_NAME = process.env.SMTP_FROM_NAME || 'Luxury Service Manga';

let transporter: nodemailer.Transporter | null = null;
let smtpOrigen: string;

async function initTransporter(): Promise<void> {
  if (SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST, port: SMTP_PORT, secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS }
    });
    smtpOrigen = SMTP_HOST;
    console.log(`[EMAIL] SMTP configurado: ${SMTP_HOST} (${FROM_EMAIL})`);
    return;
  }

  try {
    transporter = nodemailer.createTransport({ direct: true } as any);
    smtpOrigen = 'directo (sin relay)';
    console.log('[EMAIL] Envío directo — sin configuración requerida.');
    console.log('[EMAIL] Los correos se entregan directamente al servidor MX del destinatario.');
  } catch (err) {
    console.warn('[EMAIL] No se pudo crear transporte directo:', (err as Error).message);
    smtpOrigen = 'pending_emails';
  }
}

let initPromise: Promise<void> | null = null;
export function ensureTransporter(): Promise<void> {
  if (!initPromise) initPromise = initTransporter();
  return initPromise;
}

export function smtpConfigurado(): boolean {
  return transporter !== null;
}

type PendingEmail = {
  to: string;
  nombre: string;
  tipo: 'ticket' | 'confirmacion' | 'general';
  asunto: string;
  datos: Record<string, unknown>;
  createdAt: Date;
  intentos: number;
  ultimoError?: string;
};

async function guardarEmailPendiente(data: Omit<PendingEmail, 'createdAt' | 'intentos'>) {
  try {
    await getDb().collection('pending_emails').insertOne({
      ...data,
      createdAt: new Date(),
      intentos: 0,
    } as PendingEmail);
  } catch (err) {
    console.error('[EMAIL] Error guardando email pendiente:', (err as Error).message);
  }
}

async function enviarConReintento(sendFn: () => Promise<any>, params: { to: string; nombre: string; asunto: string; tipo: PendingEmail['tipo']; datos: Record<string, unknown> }, maxAttempts = 3): Promise<boolean> {
  await ensureTransporter();
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (!transporter) break;
      const info = await sendFn();
      return true;
    } catch (err) {
      const msg = (err as Error).message;
      console.error(`[EMAIL] Intento ${attempt}/${maxAttempts} falló para ${params.to}: ${msg}`);
      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, attempt * 2000));
      }
    }
  }

  if (!transporter) {
    console.log(`[EMAIL SIMULADO] Para: ${params.to} | Asunto: ${params.asunto}`);
  }

  await guardarEmailPendiente({
    to: params.to,
    nombre: params.nombre,
    tipo: params.tipo,
    asunto: params.asunto,
    datos: params.datos,
  });
  return false;
}

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
  producto?: string;
}) {
  const horaLegible = params.horario === '10:00' ? '10:00 a.m.' : params.horario === '14:00' ? '2:00 p.m.' : params.horario;
  const totalFormateado = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(params.precioTotal);
  const productoRow = params.producto
    ? `<tr><td style="padding: 0.75rem; border-bottom: 1px solid #eee; color: #888;">Producto</td><td style="padding: 0.75rem; border-bottom: 1px solid #eee; font-weight: 600; color: #0a0a0a;">${params.producto}</td></tr>`
    : '';

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0;">
<div style="max-width: 600px; margin: 0 auto; background: #fff;">
<div style="background: #0a0a0a; padding: 2rem; text-align: center;">
<h1 style="color: #ff2b2b; margin: 0; font-size: 1.5rem; letter-spacing: 0.1em;">LUXURY SERVICE MANGA</h1>
<p style="color: rgba(255,255,255,0.6); margin: 0.25rem 0 0; font-size: 0.85rem;">Detailing Automotriz Premium · Manga, Cartagena</p>
</div>
<div style="padding: 2rem;">
<h2 style="margin: 0 0 1rem; font-size: 1.2rem; color: #0a0a0a;">✅ Pago confirmado — cita agendada</h2>
<p style="color: #555; line-height: 1.6;">Hola <strong>${params.nombre}</strong>, tu pago ha sido recibido y tu cita está confirmada. Estos son los detalles:</p>
<table style="width: 100%; border-collapse: collapse; margin: 1.25rem 0;">
<tr><td style="padding: 0.75rem; border-bottom: 1px solid #eee; color: #888;">Servicio</td><td style="padding: 0.75rem; border-bottom: 1px solid #eee; font-weight: 600; color: #0a0a0a;">${params.servicio}</td></tr>
${productoRow}
<tr><td style="padding: 0.75rem; border-bottom: 1px solid #eee; color: #888;">Fecha</td><td style="padding: 0.75rem; border-bottom: 1px solid #eee; font-weight: 600; color: #0a0a0a;">${params.fecha}</td></tr>
<tr><td style="padding: 0.75rem; border-bottom: 1px solid #eee; color: #888;">Horario</td><td style="padding: 0.75rem; border-bottom: 1px solid #eee; font-weight: 600; color: #0a0a0a;">${horaLegible}</td></tr>
<tr><td style="padding: 0.75rem; border-bottom: 1px solid #eee; color: #888;">Total pagado</td><td style="padding: 0.75rem; border-bottom: 1px solid #eee; font-weight: 700; color: #ff2b2b; font-size: 1.1rem;">${totalFormateado}</td></tr>
<tr><td style="padding: 0.75rem; border-bottom: 1px solid #eee; color: #888;">Referencia</td><td style="padding: 0.75rem; border-bottom: 1px solid #eee; font-weight: 600; color: #555; font-family: monospace;">${params.reference}</td></tr>
</table>
<div style="background: #1a1a1a; padding: 1.25rem; border-radius: 12px; margin: 1.25rem 0;">
<p style="color: #fff; margin: 0 0 0.75rem; font-weight: 700; font-size: 0.95rem;">📍 Instrucciones importantes</p>
<p style="color: #ccc; margin: 0 0 0.5rem; font-size: 0.85rem; line-height: 1.5;">🔴 <strong>Llega 10 minutos antes</strong> de tu cita para realizar el pago en el local y recibir la revisión inicial de tu vehículo.</p>
<p style="color: #ccc; margin: 0; font-size: 0.85rem; line-height: 1.5;">🔧 El valor final del servicio puede variar según el <strong>estado y tipo de tu vehículo</strong>. Nuestro equipo evaluará tu auto al llegar y te informará si aplican costos adicionales antes de comenzar.</p>
</div>
${params.qrBase64 ? `
<div style="text-align: center; margin: 1.5rem 0;">
<img src="cid:qr" alt="Comprobante de pago" style="width: 200px; height: 200px; border-radius: 1rem; border: 2px solid #eee;" />
<p style="color: #888; font-size: 0.8rem; margin: 0.5rem 0 0;">Código de comprobante de pago</p>
</div>` : ''}
${params.checkoutUrl ? `
<div style="text-align: center; margin: 1.5rem 0;">
<a href="${params.checkoutUrl}" style="display: inline-block; background: #ff2b2b; color: #000; font-weight: 700; padding: 0.85rem 2rem; border-radius: 999px; text-decoration: none; font-size: 1rem;">Ver comprobante</a>
</div>` : ''}
<p style="color: #888; font-size: 0.85rem; line-height: 1.5;">IVA incluido donde aplique.</p>
</div>
<div style="background: #f9f9f9; padding: 1.25rem 2rem; text-align: center; border-top: 1px solid #eee;">
<p style="color: #888; font-size: 0.8rem; margin: 0;">Av. Principal Manga, Cartagena, Colombia<br>Tel: 300 636 6429 &middot; @luxuryservicemysmanga</p>
</div>
</div>
</body>
</html>`;

  const productoTexto = params.producto ? `\nProducto: ${params.producto}` : '';
  const text = `Hola ${params.nombre},\n\n✅ Tu pago ha sido recibido y tu cita está confirmada.\n\nServicio: ${params.servicio}${productoTexto}\nFecha: ${params.fecha}\nHorario: ${horaLegible}\nTotal pagado: ${totalFormateado}\nReferencia: ${params.reference}\n\n📍 Llega 10 minutos antes de tu cita para la revisión inicial de tu vehículo.\n🔧 El valor final puede variar según el estado y tipo del vehículo.\n\nLuxury Service Manga - Manga, Cartagena`;

  return enviarConReintento(
    () => transporter!.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: params.to,
      subject: `✅ Cita confirmada - ${params.servicio} - Luxury Service`,
      text,
      html,
      attachments: params.qrBase64 ? [{
        filename: 'comprobante.png',
        content: Buffer.from(params.qrBase64, 'base64'),
        cid: 'qr'
      }] : []
    }),
    { to: params.to, nombre: params.nombre, asunto: `✅ Cita confirmada - ${params.servicio} - Luxury Service`, tipo: 'ticket', datos: params as unknown as Record<string, unknown> }
  );
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

  const html = `<!DOCTYPE html>
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
<div style="background: #1a1a1a; padding: 1.25rem; border-radius: 12px; margin: 1.25rem 0;">
<p style="color: #fff; margin: 0; font-size: 0.85rem; line-height: 1.5;">📍 Recuerda llegar <strong>10 minutos antes</strong> para la revisión inicial. El valor final puede variar según el <strong>estado y tipo de tu vehículo</strong>.</p>
</div>
</div>
</div>
</body>
</html>`;

  return enviarConReintento(
    () => transporter!.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: params.to,
      subject: `✅ Pago confirmado - ${params.servicio} - Luxury Service`,
      html
    }),
    { to: params.to, nombre: params.nombre, asunto: `✅ Pago confirmado - ${params.servicio} - Luxury Service`, tipo: 'confirmacion', datos: params as unknown as Record<string, unknown> }
  );
}

export async function enviarNotificacionGeneral(params: {
  to: string;
  nombre: string;
  asunto: string;
  titulo: string;
  mensaje: string;
}) {
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0;">
<div style="max-width: 600px; margin: 0 auto; background: #fff;">
<div style="background: #0a0a0a; padding: 2rem; text-align: center;">
<h1 style="color: #ff2b2b; margin: 0; font-size: 1.5rem; letter-spacing: 0.1em;">LUXURY SERVICE MANGA</h1>
<p style="color: rgba(255,255,255,0.6); margin: 0.25rem 0 0; font-size: 0.85rem;">Detailing Automotriz Premium · Manga, Cartagena</p>
</div>
<div style="padding: 2rem;">
<h2 style="margin: 0 0 1rem; font-size: 1.2rem; color: #0a0a0a;">${params.titulo}</h2>
<p style="color: #555; line-height: 1.6;">Hola <strong>${params.nombre}</strong>,</p>
<p style="color: #555; line-height: 1.6;">${params.mensaje}</p>
</div>
<div style="background: #f9f9f9; padding: 1.25rem 2rem; text-align: center; border-top: 1px solid #eee;">
<p style="color: #888; font-size: 0.8rem; margin: 0;">Av. Principal Manga, Cartagena, Colombia<br>Tel: 300 636 6429 &middot; @luxuryservicemysmanga</p>
</div>
</div>
</body>
</html>`;

  const text = `Hola ${params.nombre},\n\n${params.mensaje}\n\nLuxury Service Manga - Manga, Cartagena`;

  return enviarConReintento(
    () => transporter!.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: params.to,
      subject: params.asunto,
      text,
      html
    }),
    { to: params.to, nombre: params.nombre, asunto: params.asunto, tipo: 'general', datos: params as unknown as Record<string, unknown> }
  );
}

export async function reenviarEmailsPendientes(): Promise<{ reenviados: number; fallaron: number }> {
  if (!transporter) {
    console.log('[EMAIL] SMTP no configurado. No se pueden reenviar emails pendientes.');
    return { reenviados: 0, fallaron: 0 };
  }

  const db = getDb();
  const pendientes = await db.collection('pending_emails').find({}).sort({ createdAt: 1 }).toArray();
  let reenviados = 0;
  let fallaron = 0;

  for (const email of pendientes) {
    try {
      if (email.tipo === 'general') {
        await transporter.sendMail({
          from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
          to: email.to,
          subject: email.asunto,
          text: `Hola ${email.nombre},\n\n${(email.datos as any).mensaje || ''}\n\nLuxury Service Manga - Manga, Cartagena`,
        });
      } else {
        await transporter.sendMail({
          from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
          to: email.to,
          subject: email.asunto,
          text: `Notificación de Luxury Service para ${email.nombre}.`,
        });
      }
      await db.collection('pending_emails').deleteOne({ _id: email._id });
      reenviados++;
      console.log(`[EMAIL] Reenviado: ${email.asunto} -> ${email.to}`);
    } catch (err) {
      fallaron++;
      await db.collection('pending_emails').updateOne(
        { _id: email._id },
        { $inc: { intentos: 1 }, $set: { ultimoError: (err as Error).message } }
      );
      console.error(`[EMAIL] Error reenviando ${email.asunto}:`, (err as Error).message);
    }
  }

  return { reenviados, fallaron };
}

export function getEmailStatus() {
  return {
    configurado: transporter !== null,
    host: smtpOrigen || '(no configurado)',
    from: FROM_EMAIL,
    modoSimulado: transporter === null,
  };
}
