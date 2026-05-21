import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { sign, verify } from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';

type Bindings = { DB: D1Database; JWT_SECRET: string; };
const app = new Hono<{ Bindings: Bindings }>();
app.use('/*', cors());

async function auth(c: any, next: any) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401);
  try {
    const payload = verify(authHeader.split(' ')[1], c.env.JWT_SECRET);
    c.set('user', payload);
    await next();
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }
}
function adminRequired(c: any, next: any) {
  const user = c.get('user') as any;
  if (user.rol !== 'admin') return c.json({ error: 'Forbidden' }, 403);
  return next();
}

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+\-=[\]{}|;:,.<>~`])[A-Za-z\d@$!%*?&#^()_+\-=[\]{}|;:,.<>~`]{8,}$/;
const TERMINOS_VERSION = '1.0.0-2026';
const POLITICA_VERSION = '1.0.0-2026';

function validatePassword(password: string): string | null {
  if (!password || password.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
  if (!PASSWORD_REGEX.test(password)) return 'Debe incluir mayúsculas, minúsculas, números y un carácter especial (ISO 27001 A.9.4.3)';
  return null;
}

async function logConsent(db: D1Database, data: { usuarioId?: number; email: string; tipo: string; version: string; ip?: string; userAgent?: string }) {
  await db.prepare(
    'INSERT INTO consentimientos_auditoria (usuario_id, email, tipo, version_documento, ip_origen, user_agent) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(data.usuarioId ?? null, data.email, data.tipo, data.version, data.ip ?? null, data.userAgent ?? null).run();
}

app.get('/api/auth/check-email', async (c) => {
  const email = c.req.query('email')?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return c.json({ error: 'Email inválido' }, 400);
  const user = await c.env.DB.prepare('SELECT id, nombre FROM usuarios WHERE email = ?').bind(email).first();
  return c.json({ exists: !!user, nombre: user?.nombre ?? null });
});

app.post('/api/auth/register', async (c) => {
  const body = await c.req.json();
  const { nombre, email, password, aceptaTerminos, consentimientoDatos, versionTerminos, versionPolitica } = body;
  const emailNorm = email?.trim().toLowerCase();

  if (!nombre?.trim() || !emailNorm || !password) return c.json({ error: 'Datos incompletos' }, 400);
  if (!aceptaTerminos || !consentimientoDatos) return c.json({ error: 'Debe aceptar términos y autorizar el tratamiento de datos (Ley 1581 de 2012)' }, 400);
  if (versionTerminos !== TERMINOS_VERSION || versionPolitica !== POLITICA_VERSION) return c.json({ error: 'Versión de documentos desactualizada. Recargue la página.' }, 400);

  const pwdError = validatePassword(password);
  if (pwdError) return c.json({ error: pwdError }, 400);

  const hashed = await bcrypt.hash(password, 10);
  const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'desconocida';
  const userAgent = c.req.header('User-Agent') || '';

  try {
    const result = await c.env.DB.prepare(
      `INSERT INTO usuarios (nombre, email, password_hash, rol, acepta_terminos, consentimiento_datos,
        fecha_aceptacion_terminos, version_terminos, version_politica, ip_registro)
       VALUES (?, ?, ?, 'cliente', 1, 1, datetime('now'), ?, ?, ?)`
    ).bind(nombre.trim(), emailNorm, hashed, TERMINOS_VERSION, POLITICA_VERSION, ip).run();

    const userId = result.meta.last_row_id;
    await logConsent(c.env.DB, { usuarioId: Number(userId), email: emailNorm, tipo: 'registro_terminos', version: TERMINOS_VERSION, ip, userAgent });
    await logConsent(c.env.DB, { usuarioId: Number(userId), email: emailNorm, tipo: 'autorizacion_datos', version: POLITICA_VERSION, ip, userAgent });

    const user = await c.env.DB.prepare('SELECT id, nombre, email, rol FROM usuarios WHERE id = ?').bind(userId).first();
    const token = sign({ id: user.id, email: user.email, rol: user.rol }, c.env.JWT_SECRET, { expiresIn: '7d' });
    return c.json({ token, user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol } });
  } catch {
    return c.json({ error: 'El correo ya está registrado' }, 400);
  }
});

app.post('/api/auth/login', async (c) => {
  const { email, password } = await c.req.json();
  const emailNorm = email?.trim().toLowerCase();
  const user = await c.env.DB.prepare('SELECT * FROM usuarios WHERE email = ?').bind(emailNorm).first();
  if (!user || !(await bcrypt.compare(password, user.password_hash as string))) return c.json({ error: 'Credenciales incorrectas' }, 401);
  if (!user.acepta_terminos || !user.consentimiento_datos) return c.json({ error: 'Cuenta pendiente de aceptación de términos. Contacte soporte.' }, 403);
  const token = sign({ id: user.id, email: user.email, rol: user.rol }, c.env.JWT_SECRET, { expiresIn: '7d' });
  return c.json({ token, user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol } });
});

app.post('/api/auth/revoke-consent', auth, async (c) => {
  const user = c.get('user') as { id: number; email: string };
  const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'desconocida';
  await c.env.DB.prepare('UPDATE usuarios SET consentimiento_datos = 0 WHERE id = ?').bind(user.id).run();
  await logConsent(c.env.DB, { usuarioId: user.id, email: user.email, tipo: 'revocacion_datos', version: POLITICA_VERSION, ip });
  return c.json({ success: true, message: 'Autorización revocada. Sus datos serán eliminados conforme a la Ley 1581 en el plazo legal.' });
});

app.get('/api/services', async (c) => { const s = await c.env.DB.prepare('SELECT * FROM servicios WHERE activo=1').all(); return c.json(s.results); });
app.get('/api/products', async (c) => { const p = await c.env.DB.prepare('SELECT * FROM productos').all(); return c.json(p.results); });

app.post('/api/purchase', auth, async (c) => {
  const user = c.get('user') as any;
  const { productoId, cantidad } = await c.req.json();
  const producto = await c.env.DB.prepare('SELECT * FROM productos WHERE id = ?').bind(productoId).first();
  if (!producto) return c.json({ error: 'Producto no encontrado' }, 404);
  if (producto.stock < cantidad) return c.json({ error: 'Stock insuficiente' }, 400);
  const montoTotal = parseFloat(producto.precio) * cantidad;
  await c.env.DB.prepare('INSERT INTO ventas (producto_id, usuario_id, cantidad, monto_total) VALUES (?, ?, ?, ?)').bind(productoId, user.id, cantidad, montoTotal).run();
  await c.env.DB.prepare('UPDATE productos SET stock = stock - ? WHERE id = ?').bind(cantidad, productoId).run();
  await c.env.DB.prepare('INSERT INTO transacciones (tipo, monto, descripcion, referencia_id) VALUES (?, ?, ?, ?)').bind('ingreso', montoTotal, `Venta de ${producto.nombre}`, productoId).run();
  return c.json({ success: true });
});

const HORARIOS = ['09:00', '11:00', '15:00'];
app.get('/api/appointments/available', async (c) => {
  const fecha = c.req.query('fecha');
  const servicioId = c.req.query('servicioId');
  if (!fecha || !servicioId) return c.json([]);
  const ocupados = await c.env.DB.prepare('SELECT horario FROM citas WHERE fecha = ? AND servicio_id = ? AND estado NOT IN ("cancelada")').bind(fecha, servicioId).all();
  const ocupadosSet = new Set(ocupados.results.map((r: any) => r.horario));
  return c.json(HORARIOS.filter(h => !ocupadosSet.has(h)));
});
app.post('/api/appointments', auth, async (c) => {
  const user = c.get('user') as any;
  const { servicioId, fecha, horario } = await c.req.json();
  if (!HORARIOS.includes(horario)) return c.json({ error: 'Horario inválido' }, 400);
  const existing = await c.env.DB.prepare('SELECT id FROM citas WHERE fecha = ? AND horario = ? AND servicio_id = ? AND estado NOT IN ("cancelada")').bind(fecha, horario, servicioId).first();
  if (existing) return c.json({ error: 'Horario ocupado' }, 409);
  await c.env.DB.prepare('INSERT INTO citas (usuario_id, servicio_id, fecha, horario, estado) VALUES (?, ?, ?, ?, ?)').bind(user.id, servicioId, fecha, horario, 'pendiente').run();
  return c.json({ success: true });
});
app.get('/api/appointments/my', auth, async (c) => {
  const user = c.get('user') as any;
  const citas = await c.env.DB.prepare('SELECT c.*, s.nombre as servicio_nombre FROM citas c JOIN servicios s ON c.servicio_id = s.id WHERE c.usuario_id = ? ORDER BY c.fecha DESC').bind(user.id).all();
  return c.json(citas.results);
});
app.put('/api/appointments/:id/cancel', auth, async (c) => {
  const id = c.req.param('id');
  const user = c.get('user') as any;
  const cita = await c.env.DB.prepare('SELECT * FROM citas WHERE id = ?').bind(id).first();
  if (!cita || cita.usuario_id !== user.id) return c.json({ error: 'Not found' }, 404);
  await c.env.DB.prepare('UPDATE citas SET estado = "cancelada" WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

app.get('/api/admin/appointments', auth, adminRequired, async (c) => {
  const citas = await c.env.DB.prepare('SELECT c.*, u.nombre as cliente_nombre, s.nombre as servicio_nombre FROM citas c JOIN usuarios u ON c.usuario_id = u.id JOIN servicios s ON c.servicio_id = s.id ORDER BY c.fecha DESC').all();
  return c.json(citas.results);
});
app.put('/api/admin/appointments/:id/status', auth, adminRequired, async (c) => {
  const { estado } = await c.req.json();
  await c.env.DB.prepare('UPDATE citas SET estado = ? WHERE id = ?').bind(estado, c.req.param('id')).run();
  return c.json({ success: true });
});
app.get('/api/admin/dashboard/stats', auth, adminRequired, async (c) => {
  const ingresos = await c.env.DB.prepare('SELECT SUM(monto) as total FROM transacciones WHERE tipo="ingreso"').first();
  const egresos = await c.env.DB.prepare('SELECT SUM(monto) as total FROM transacciones WHERE tipo="egreso"').first();
  return c.json({ ingresos: ingresos?.total || 0, egresos: egresos?.total || 0 });
});
app.get('/api/admin/dashboard/product-sales', auth, adminRequired, async (c) => {
  const productStats = await c.env.DB.prepare(`SELECT p.id, p.nombre, p.categoria, p.stock, COUNT(v.id) as ventas, COALESCE(SUM(v.monto_total), 0) as ingresos FROM productos p LEFT JOIN ventas v ON p.id = v.producto_id GROUP BY p.id ORDER BY ventas DESC`).all();
  const stats = productStats.results.map((row: any) => ({ ...row, ventas: Number(row.ventas), ingresos: Number(row.ingresos) }));
  const topProducts = stats.slice(0, 3);
  const bottomProducts = stats.slice(-3).reverse();
  return c.json({ productStats: stats, topProducts, bottomProducts });
});
app.get('/api/admin/dashboard/export', auth, adminRequired, async (c) => {
  const rows = await c.env.DB.prepare('SELECT fecha, tipo, monto, descripcion FROM transacciones ORDER BY fecha').all();
  let csv = 'fecha,tipo,monto,descripcion
';
  for (const row of rows.results) csv += `${row.fecha},${row.tipo},${row.monto},${row.descripcion}
`;
  return new Response(csv, { headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename=reporte.csv' } });
});
app.get('/api/admin/products', auth, adminRequired, async (c) => { const p = await c.env.DB.prepare('SELECT * FROM productos').all(); return c.json(p.results); });
app.post('/api/admin/products', auth, adminRequired, async (c) => {
  const { nombre, descripcion, precio, stock, categoria } = await c.req.json();
  await c.env.DB.prepare('INSERT INTO productos (nombre, descripcion, precio, stock, categoria) VALUES (?, ?, ?, ?, ?)').bind(nombre, descripcion, precio, stock, categoria).run();
  return c.json({ success: true });
});
app.put('/api/admin/products/:id', auth, adminRequired, async (c) => {
  const { precio, stock } = await c.req.json();
  await c.env.DB.prepare('UPDATE productos SET precio = ?, stock = ? WHERE id = ?').bind(precio, stock, c.req.param('id')).run();
  return c.json({ success: true });
});
app.delete('/api/admin/products/:id', auth, adminRequired, async (c) => {
  await c.env.DB.prepare('DELETE FROM productos WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ success: true });
});

app.post('/api/chatbot', async (c) => {
  const { message } = await c.req.json();
  const lower = message.toLowerCase();
  let reply = '';
  if (lower.includes('horario')) reply = 'Horarios: 09:00, 11:00, 15:00.';
  else if (lower.includes('servicio')) reply = 'Servicios: cambio aceite, lavado, llantas, polarizado.';
  else if (lower.includes('cita')) reply = 'Agenda tu cita en nuestra web.';
  else reply = 'Hola, soy el asistente de Luxury Service. Pregúntame sobre horarios, servicios o citas.';
  return c.json({ reply });
});

app.get('/cron', async (c) => { await c.env.DB.prepare(`DELETE FROM citas WHERE fecha < date('now') AND estado != 'completada'`).run(); return c.text('OK'); });

export default app;
