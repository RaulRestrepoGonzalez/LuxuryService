CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  rol TEXT DEFAULT 'cliente',
  password_hash TEXT NOT NULL,
  acepta_terminos INTEGER NOT NULL DEFAULT 0,
  consentimiento_datos INTEGER NOT NULL DEFAULT 0,
  fecha_aceptacion_terminos DATETIME,
  version_terminos TEXT,
  version_politica TEXT,
  ip_registro TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS consentimientos_auditoria (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER,
  email TEXT NOT NULL,
  tipo TEXT NOT NULL,
  version_documento TEXT NOT NULL,
  ip_origen TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS servicios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  duracion_minutos INTEGER,
  precio_base DECIMAL(10,2),
  activo BOOLEAN DEFAULT 1
);

CREATE TABLE IF NOT EXISTS citas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL,
  servicio_id INTEGER NOT NULL,
  fecha DATE NOT NULL,
  horario TIME NOT NULL,
  estado TEXT DEFAULT 'pendiente',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  FOREIGN KEY (servicio_id) REFERENCES servicios(id)
);

CREATE TABLE IF NOT EXISTS productos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  precio DECIMAL(10,2) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  categoria TEXT,
  imagen_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transacciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT NOT NULL,
  monto DECIMAL(10,2) NOT NULL,
  fecha DATE DEFAULT CURRENT_DATE,
  descripcion TEXT,
  referencia_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ventas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  producto_id INTEGER NOT NULL,
  usuario_id INTEGER NOT NULL,
  cantidad INTEGER NOT NULL DEFAULT 1,
  monto_total DECIMAL(10,2) NOT NULL,
  fecha DATE DEFAULT CURRENT_DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (producto_id) REFERENCES productos(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

INSERT INTO servicios (nombre, descripcion, duracion_minutos, precio_base) VALUES
('Cambio de aceite', 'Cambio de aceite y filtro', 30, 50.00),
('Lavado vehicular', 'Lavado completo exterior e interior', 45, 25.00),
('Cambio de llantas', 'Cambio de 4 llantas + balanceo', 60, 80.00),
('Polarizado', 'Polarizado de lunas', 120, 150.00);
