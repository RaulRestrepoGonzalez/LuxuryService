-- Migración para bases de datos existentes (D1/SQLite)
-- Ejecutar si ya tenía la tabla usuarios sin campos de consentimiento

ALTER TABLE usuarios ADD COLUMN acepta_terminos INTEGER NOT NULL DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN consentimiento_datos INTEGER NOT NULL DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN fecha_aceptacion_terminos DATETIME;
ALTER TABLE usuarios ADD COLUMN version_terminos TEXT;
ALTER TABLE usuarios ADD COLUMN version_politica TEXT;
ALTER TABLE usuarios ADD COLUMN ip_registro TEXT;

-- Usuarios existentes: marcar consentimiento implícito de migración (revisar política interna)
UPDATE usuarios SET acepta_terminos = 1, consentimiento_datos = 1,
  fecha_aceptacion_terminos = datetime('now'),
  version_terminos = '1.0.0-2026-migracion',
  version_politica = '1.0.0-2026-migracion'
WHERE acepta_terminos = 0;

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
