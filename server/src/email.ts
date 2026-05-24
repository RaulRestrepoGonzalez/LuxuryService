import nodemailer from 'nodemailer';
import { getDb } from './db.js';

// ── Configuration ──

const CFG = {
  host: process.env.SMTP_HOST || '',
  port: Number(process.env.SMTP_PORT) || 587,
  user: process.env.SMTP_USER || '',
  pass: process.env.SMTP_PASS || '',
  from: process.env.SMTP_FROM || 'notificaciones@luxuryservice.co',
  fromName: process.env.SMTP_FROM_NAME || 'Luxury Service Manga',
  dkimDomain: process.env.SMTP_DKIM_DOMAIN || '',
  dkimSelector: process.env.SMTP_DKIM_SELECTOR || '',
  dkimPrivateKey: process.env.SMTP_DKIM_PRIVATE_KEY || '',
  retryIntervalMs: Number(process.env.EMAIL_RETRY_INTERVAL_MS) || 300_000,
  maxRetries: Number(process.env.EMAIL_MAX_RETRIES) || 10,
};

let transporter: nodemailer.Transporter | null = null;
let transportMode = 'no configurado';
let transportVerified = false;
let workerTimer: ReturnType<typeof setInterval> | null = null;

// ── Transporter initialization ──

async function initTransporter(): Promise<void> {
  if (CFG.host) {
    const opts: Record<string, unknown> = {
      host: CFG.host,
      port: CFG.port,
      secure: CFG.port === 465,
      auth: CFG.user ? { user: CFG.user, pass: CFG.pass } : undefined,
      tls: { rejectUnauthorized: true },
    };
    if (CFG.dkimDomain && CFG.dkimSelector && CFG.dkimPrivateKey) {
      (opts as any).dkim = {
        domainName: CFG.dkimDomain,
        keySelector: CFG.dkimSelector,
        privateKey: CFG.dkimPrivateKey,
      };
    }
    transporter = nodemailer.createTransport(opts);
    transportMode = `SMTP ${CFG.host}:${CFG.port}`;
    try {
      await transporter.verify();
      transportVerified = true;
      console.log(`[EMAIL] ✅ SMTP configurado y verificado: ${CFG.host}:${CFG.port} (${CFG.from})`);
    } catch (err) {
      transportVerified = false;
      console.warn(`[EMAIL] ⚠️ SMTP configurado pero NO se pudo verificar: ${CFG.host}`);
      console.warn(`[EMAIL]    Error: ${(err as Error).message}`);
      console.warn(`[EMAIL]    Los correos se guardarán como pendientes hasta que el SMTP funcione.`);
    }
  } else {
    // Fallback: direct MX delivery (best-effort)
    try {
      transporter = nodemailer.createTransport({ direct: true } as any);
      transportMode = 'directo (sin relay SMTP)';
      console.log(`[EMAIL] ⚠️  Sin SMTP configurado — usando envío directo al MX.`);
      console.log(`[EMAIL]    Recomendación: configura SMTP_HOST en .env para entrega confiable.`);
      console.log(`[EMAIL]    Los correos pueden llegar a SPAM o no llegar.`);
    } catch (err) {
      transporter = null;
      transportMode = 'solo pendientes (cola MongoDB)';
      console.warn(`[EMAIL] ❌ No se pudo crear transporte directo: ${(err as Error).message}`);
      console.warn(`[EMAIL]    Todos los correos se guardarán como pendientes.`);
    }
  }
}

let initPromise: Promise<void> | null = null;
export function ensureTransporter(): Promise<void> {
  if (!initPromise) initPromise = initTransporter();
  return initPromise;
}

export function smtpConfigurado(): boolean {
  return transporter !== null && transportVerified;
}

export function getEmailStatus() {
  return {
    configurado: transporter !== null,
    verificado: transportVerified,
    host: CFG.host || '(directo/MX)',
    from: CFG.from,
    modo: transportMode,
    modoSimulado: transporter === null,
    colaPendientes: true,
  };
}

// ── Pending email queue ──

type PendingEmail = {
  _id?: any;
  to: string;
  nombre: string;
  tipo: 'ticket' | 'confirmacion' | 'general';
  asunto: string;
  html?: string;
  text?: string;
  datos: Record<string, unknown>;
  createdAt: Date;
  intentos: number;
  ultimoError?: string;
  proximoIntento?: Date;
};

async function guardarEmailPendiente(data: Omit<PendingEmail, 'createdAt' | 'intentos'> & { html?: string; text?: string }) {
  try {
    await getDb().collection('pending_emails').insertOne({
      ...data,
      createdAt: new Date(),
      intentos: 0,
    });
  } catch (err) {
    console.error('[EMAIL] Error guardando email pendiente:', (err as Error).message);
  }
}

// ── Retry logic ──

async function enviarConReintento(
  sendFn: () => Promise<any>,
  params: {
    to: string; nombre: string; asunto: string;
    tipo: PendingEmail['tipo']; datos: Record<string, unknown>;
    html?: string; text?: string;
  },
  maxAttempts = 3
): Promise<boolean> {
  await ensureTransporter();

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (!transporter) break;
      const info = await sendFn();
      const id = info.messageId ? ` (id: ${info.messageId})` : '';
      console.log(`[EMAIL] ✅ Enviado a ${params.to}: "${params.asunto}"${id}`);
      return true;
    } catch (err) {
      const msg = (err as Error).message;
      console.error(`[EMAIL] ❌ Intento ${attempt}/${maxAttempts} falló para ${params.to}: ${msg}`);
      if (attempt < maxAttempts) {
        const wait = attempt * 2000;
        console.log(`[EMAIL]    Reintentando en ${wait/1000}s...`);
        await new Promise(r => setTimeout(r, wait));
      }
    }
  }

  if (!transporter) {
    console.log(`[EMAIL] ⏸️  Sin transporte — email guardado como pendiente: ${params.asunto} -> ${params.to}`);
  } else {
    console.log(`[EMAIL] ⏸️  Email guardado como pendiente tras ${maxAttempts} intentos: ${params.asunto} -> ${params.to}`);
  }

  await guardarEmailPendiente({
    to: params.to,
    nombre: params.nombre,
    tipo: params.tipo,
    asunto: params.asunto,
    datos: params.datos,
    html: params.html,
    text: params.text,
  });
  return false;
}

// ── Spam notice footer ──

const SPAM_NOTICE_HTML = `
<div style="margin-top: 1.5rem; padding: 1rem; background: #fff8e1; border-radius: 8px; border: 1px solid #ffe082;">
  <p style="color: #795548; font-size: 0.8rem; margin: 0; line-height: 1.5;">
    📧 <strong>¿No encuentras este correo?</strong> Revisa tu bandeja de <strong>Spam</strong> o <strong>Correo no deseado</strong>.
    Si está ahí, márcalo como "No es spam" para asegurar la entrega de futuros mensajes.
    Agrega <strong>${CFG.from}</strong> a tu libreta de direcciones o contactos.
  </p>
</div>`;

const SPAM_NOTICE_TEXT = `\n\n---\n📧 ¿No encuentras este correo? Revisa tu bandeja de SPAM o Correo no deseado. Si está ahí, márcalo como "No es spam". Agrega ${CFG.from} a tus contactos para asegurar la entrega.`;

// ── Templates ──

function baseHtml(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0;">
<div style="max-width: 600px; margin: 0 auto; background: #fff;">
<div style="background: #0a0a0a; padding: 2rem; text-align: center;">
<h1 style="color: #ff2b2b; margin: 0; font-size: 1.5rem; letter-spacing: 0.1em;">LUXURY SERVICE MANGA</h1>
<p style="color: rgba(255,255,255,0.6); margin: 0.25rem 0 0; font-size: 0.85rem;">Detailing Automotriz Premium · Manga, Cartagena</p>
</div>
<div style="padding: 2rem;">
${content}
${SPAM_NOTICE_HTML}
</div>
<div style="background: #f9f9f9; padding: 1.25rem 2rem; text-align: center; border-top: 1px solid #eee;">
<p style="color: #888; font-size: 0.8rem; margin: 0;">Av. Principal Manga, Cartagena, Colombia<br>Tel: 300 636 6429 &middot; @luxuryservicemysmanga</p>
<p style="color: #aaa; font-size: 0.75rem; margin: 0.5rem 0 0;">Este es un mensaje automático, por favor no respondas a este correo.</p>
</div>
</div>
</body>
</html>`;
}

// ── Send functions ──

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

  const content = `
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
<p style="color: #888; font-size: 0.85rem; line-height: 1.5;">IVA incluido donde aplique.</p>`;

  const html = baseHtml(content);
  const productoTexto = params.producto ? `\nProducto: ${params.producto}` : '';
  const text = `Hola ${params.nombre},\n\n✅ Tu pago ha sido recibido y tu cita está confirmada.\n\nServicio: ${params.servicio}${productoTexto}\nFecha: ${params.fecha}\nHorario: ${horaLegible}\nTotal pagado: ${totalFormateado}\nReferencia: ${params.reference}\n\n📍 Llega 10 minutos antes de tu cita para la revisión inicial de tu vehículo.\n🔧 El valor final puede variar según el estado y tipo del vehículo.\n\nLuxury Service Manga - Manga, Cartagena${SPAM_NOTICE_TEXT}`;

  return enviarConReintento(
    () => transporter!.sendMail({
      from: `"${CFG.fromName}" <${CFG.from}>`,
      to: params.to,
      subject: `✅ Cita confirmada - ${params.servicio} - Luxury Service`,
      text,
      html,
      attachments: params.qrBase64 ? [{
        filename: 'comprobante.png',
        content: Buffer.from(params.qrBase64, 'base64'),
        cid: 'qr'
      }] : [],
      priority: 'high',
    }),
    {
      to: params.to, nombre: params.nombre,
      asunto: `✅ Cita confirmada - ${params.servicio} - Luxury Service`,
      tipo: 'ticket', datos: params as unknown as Record<string, unknown>,
      html, text,
    }
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

  const content = `
<h2 style="margin: 0 0 1rem; font-size: 1.2rem; color: #0a0a0a;">✅ Pago confirmado</h2>
<p style="color: #555; line-height: 1.6;">Hola <strong>${params.nombre}</strong>, tu pago ha sido recibido. Tu cita está confirmada.</p>
<p style="color: #555;"><strong>${params.servicio}</strong> — ${params.fecha} a las ${horaLegible}</p>
<p style="color: #888; font-size: 0.85rem;">Ref: ${params.reference}</p>
<div style="background: #1a1a1a; padding: 1.25rem; border-radius: 12px; margin: 1.25rem 0;">
<p style="color: #fff; margin: 0; font-size: 0.85rem; line-height: 1.5;">📍 Recuerda llegar <strong>10 minutos antes</strong> para la revisión inicial. El valor final puede variar según el <strong>estado y tipo de tu vehículo</strong>.</p>
</div>`;

  const html = baseHtml(content);
  const text = `Hola ${params.nombre},\n\n✅ Tu pago ha sido recibido.\n\n${params.servicio} — ${params.fecha} a las ${horaLegible}\nRef: ${params.reference}\n\n📍 Recuerda llegar 10 minutos antes para la revisión inicial.\n\nLuxury Service Manga - Manga, Cartagena${SPAM_NOTICE_TEXT}`;

  return enviarConReintento(
    () => transporter!.sendMail({
      from: `"${CFG.fromName}" <${CFG.from}>`,
      to: params.to,
      subject: `✅ Pago confirmado - ${params.servicio} - Luxury Service`,
      html,
      text,
    }),
    {
      to: params.to, nombre: params.nombre,
      asunto: `✅ Pago confirmado - ${params.servicio} - Luxury Service`,
      tipo: 'confirmacion', datos: params as unknown as Record<string, unknown>,
      html, text,
    }
  );
}

export async function enviarNotificacionGeneral(params: {
  to: string;
  nombre: string;
  asunto: string;
  titulo: string;
  mensaje: string;
}) {
  const content = `
<h2 style="margin: 0 0 1rem; font-size: 1.2rem; color: #0a0a0a;">${params.titulo}</h2>
<p style="color: #555; line-height: 1.6;">Hola <strong>${params.nombre}</strong>,</p>
<p style="color: #555; line-height: 1.6;">${params.mensaje}</p>`;

  const html = baseHtml(content);
  const text = `Hola ${params.nombre},\n\n${params.mensaje}\n\nLuxury Service Manga - Manga, Cartagena${SPAM_NOTICE_TEXT}`;

  return enviarConReintento(
    () => transporter!.sendMail({
      from: `"${CFG.fromName}" <${CFG.from}>`,
      to: params.to,
      subject: params.asunto,
      text,
      html,
    }),
    {
      to: params.to, nombre: params.nombre,
      asunto: params.asunto,
      tipo: 'general', datos: params as unknown as Record<string, unknown>,
      html, text,
    }
  );
}

// ── Start background worker for pending emails ──

export function iniciarColaPendientes(): void {
  if (workerTimer) return;
  console.log(`[EMAIL] 🕐 Cola de pendientes: cada ${CFG.retryIntervalMs / 1000}s (máx ${CFG.maxRetries} intentos)`);
  workerTimer = setInterval(async () => {
    try {
      const result = await reenviarEmailsPendientes();
      if (result.reenviados > 0 || result.fallaron > 0) {
        console.log(`[EMAIL] Cola: ${result.reenviados} reenviados, ${result.fallaron} fallaron`);
      }
    } catch (err) {
      console.error('[EMAIL] Error en cola de pendientes:', (err as Error).message);
    }
  }, CFG.retryIntervalMs);
}

export function detenerColaPendientes(): void {
  if (workerTimer) {
    clearInterval(workerTimer);
    workerTimer = null;
  }
}

// ── Retry all pending emails ──

export async function reenviarEmailsPendientes(): Promise<{ reenviados: number; fallaron: number }> {
  if (!transporter) {
    return { reenviados: 0, fallaron: 0 };
  }

  const db = getDb();
  const ahora = new Date();
  const pendientes = await db.collection('pending_emails').find({
    intentos: { $lt: CFG.maxRetries },
    $or: [
      { proximoIntento: { $exists: false } },
      { proximoIntento: { $lte: ahora } },
    ],
  }).sort({ createdAt: 1 }).toArray();

  let reenviados = 0;
  let fallaron = 0;

  for (const email of pendientes) {
    try {
      await transporter.sendMail({
        from: `"${CFG.fromName}" <${CFG.from}>`,
        to: email.to,
        subject: email.asunto,
        text: email.text || `Notificación de Luxury Service para ${email.nombre}.`,
        html: email.html || undefined,
      });
      await db.collection('pending_emails').deleteOne({ _id: email._id });
      reenviados++;
      console.log(`[EMAIL] 🔄 Reenviado (${email.tipo}): ${email.asunto} -> ${email.to}`);
    } catch (err) {
      fallaron++;
      const intentos = (email.intentos || 0) + 1;
      const nextRetry = new Date(ahora.getTime() + Math.min(intentos * 60_000, 3_600_000));
      const update: Record<string, unknown> = {
        $inc: { intentos: 1 },
        $set: { ultimoError: (err as Error).message, proximoIntento: nextRetry },
      };
      if (intentos >= CFG.maxRetries) {
        (update.$set as Record<string, unknown>)['estado'] = 'abandonado';
        console.error(`[EMAIL] 🚫 Abandonado tras ${intentos} intentos: ${email.asunto} -> ${email.to}`);
      }
      await db.collection('pending_emails').updateOne({ _id: email._id }, update as any);
    }
  }

  return { reenviados, fallaron };
}

// ── Verify config at startup ──

export async function verificarConfiguracion(): Promise<void> {
  await ensureTransporter();

  if (!CFG.host) {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  ⚠️  CORREO ELECTRÓNICO: SIN CONFIGURAR                     ║');
    console.log('║                                                              ║');
    console.log('║  Los correos se enviarán de forma directa (sin relay SMTP),  ║');
    console.log('║  lo cual puede causar que no lleguen o lleguen a SPAM.      ║');
    console.log('║                                                              ║');
    console.log('║  Para configuración recomendada, edita server/.env:          ║');
    console.log('║                                                              ║');
    console.log('║  Opción 1 — Gmail (requiere App Password):                   ║');
    console.log('║    SMTP_HOST=smtp.gmail.com                                  ║');
    console.log('║    SMTP_PORT=587                                             ║');
    console.log('║    SMTP_USER=tuemail@gmail.com                               ║');
    console.log('║    SMTP_PASS=abcd efgh ijkl mnop  (App Password 16 chars)    ║');
    console.log('║                                                              ║');
    console.log('║  Opción 2 — Brevo/Sendinblue (300/día gratis):               ║');
    console.log('║    SMTP_HOST=smtp-relay.brevo.com                            ║');
    console.log('║    SMTP_PORT=587                                             ║');
    console.log('║    SMTP_USER=tuemail@ejemplo.com                             ║');
    console.log('║    SMTP_PASS=tu_api_key                                      ║');
    console.log('║                                                              ║');
    console.log('║  Opción 3 — Outlook/Hotmail:                                 ║');
    console.log('║    SMTP_HOST=smtp-mail.outlook.com                           ║');
    console.log('║    SMTP_PORT=587                                             ║');
    console.log('║    SMTP_USER=tuemail@outlook.com                             ║');
    console.log('║    SMTP_PASS=tu_contraseña                                   ║');
    console.log('║                                                              ║');
    console.log('║  Para producción se recomienda un servicio transaccional     ║');
    console.log('║  como Brevo, SendGrid, o Amazon SES.                         ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');
    return;
  }

  if (!transportVerified) {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  ⚠️  CORREO: SMTP CONFIGURADO PERO NO VERIFICADO             ║');
    console.log(`║  Host: ${CFG.host.padEnd(48)}║`);
    console.log('║                                                              ║');
    console.log('║  Revisa que las credenciales sean correctas y que el         ║');
    console.log('║  servidor SMTP permita conexiones desde este servidor.       ║');
    console.log('║  Los correos se pondrán en cola hasta que funcione.          ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');
    return;
  }

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ CORREO ELECTRÓNICO CONFIGURADO CORRECTAMENTE             ║');
  console.log(`║  Host: ${CFG.host.padEnd(48)}║`);
  console.log(`║  From: ${CFG.from.padEnd(48)}║`);
  if (CFG.dkimDomain) console.log(`║  DKIM: ${CFG.dkimDomain.padEnd(48)}║`);
  console.log('║                                                              ║');
  console.log('║  Para evitar que los correos lleguen a SPAM:                 ║');
  console.log('║  1. Configura registros SPF en tu DNS                        ║');
  console.log('║  2. Configura DKIM si tu proveedor lo soporta                ║');
  console.log('║  3. Configura DMARC para monitoreo                           ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
}

// ── Send a test email ──

export async function enviarCorreoPrueba(to: string): Promise<boolean> {
  await ensureTransporter();
  return enviarConReintento(
    () => transporter!.sendMail({
      from: `"${CFG.fromName}" <${CFG.from}>`,
      to,
      subject: '🔧 Prueba de configuración SMTP - Luxury Service',
      html: baseHtml(`
<h2 style="margin: 0 0 1rem; font-size: 1.2rem; color: #0a0a0a;">🔧 Prueba exitosa</h2>
<p style="color: #555; line-height: 1.6;">Hola, este es un correo de prueba desde <strong>Luxury Service Manga</strong>.</p>
<p style="color: #555; line-height: 1.6;">Si recibiste este mensaje, la configuración SMTP está funcionando correctamente. ✅</p>
<p style="color: #555; line-height: 1.6;">Configuración actual: <strong>${CFG.host || 'directo/MX'}</strong></p>
`),
      text: `🔧 Prueba de configuración SMTP - Luxury Service\n\nSi recibiste este mensaje, la configuración SMTP está funcionando correctamente.\n\nConfiguración actual: ${CFG.host || 'directo/MX'}`,
    }),
    { to, nombre: to.split('@')[0], asunto: '🔧 Prueba de configuración SMTP - Luxury Service', tipo: 'general', datos: {} }
  );
}
