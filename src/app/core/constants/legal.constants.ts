export const TERMINOS_VERSION = '1.0.0-2026';
export const POLITICA_VERSION = '1.0.0-2026';

export const TERMINOS_Y_CONDICIONES = `
TÉRMINOS Y CONDICIONES DE USO — LUXURY SERVICE

Última actualización: mayo de 2026 | Versión ${TERMINOS_VERSION}

1. IDENTIFICACIÓN DEL RESPONSABLE
Luxury Service (en adelante, "la Empresa") es responsable del tratamiento de datos personales conforme a la Ley 1581 de 2012, el Decreto 1377 de 2013 y las directrices de la Superintendencia de Industria y Comercio (SIC) de Colombia.

2. ACEPTACIÓN
Al registrarse y marcar la casilla de aceptación, usted declara haber leído, comprendido y aceptado estos términos de forma libre, previa, expresa e informada.

3. SERVICIO
La plataforma permite agendar citas de servicios automotrices, consultar catálogos y adquirir productos. El uso está limitado a personas mayores de edad con capacidad legal en Colombia.

4. CUENTA DE USUARIO
Usted es responsable de la confidencialidad de sus credenciales. Notifique de inmediato cualquier uso no autorizado. La Empresa podrá suspender cuentas que vulneren estos términos o la normativa aplicable.

5. PROTECCIÓN DE DATOS (LEY 1581 DE 2012)
En cumplimiento del régimen de Habeas Data colombiano:
• Finalidades: gestión de citas, compras, atención al cliente y comunicaciones relacionadas con el servicio.
• Derechos del titular (Art. 8): conocer, actualizar, rectificar y suprimir datos; revocar la autorización; y presentar quejas ante la SIC.
• Datos sensibles: no se solicitan datos de categoría especial salvo autorización expresa y fundada.
• Transferencia internacional: si aplica alojamiento en la nube, se garantizarán niveles adecuados de protección conforme al Art. 26 de la Ley 1581.

6. SEGURIDAD DE LA INFORMACIÓN (ISO/IEC 27001)
La Empresa implementa controles alineados con ISO/IEC 27001, incluyendo:
• Control de acceso (dominio A.9): autenticación segura y políticas de contraseña.
• Criptografía (A.10): contraseñas almacenadas con hash bcrypt; comunicación cifrada en producción (TLS).
• Registro y auditoría (A.12): trazabilidad de consentimientos y eventos de seguridad relevantes.
• Cumplimiento legal (A.18): revisión periódica frente a normativa colombiana de protección de datos.

7. LIMITACIÓN DE RESPONSABILIDAD
El servicio se presta "tal cual". La Empresa no será responsable por daños indirectos derivados del uso de la plataforma, salvo dolo o culpa grave conforme al Código Civil colombiano.

8. LEGISLACIÓN APLICABLE
Estos términos se rigen por las leyes de la República de Colombia. Cualquier controversia se someterá a los jueces competentes del domicilio del consumidor, conforme al Estatuto del Consumidor (Ley 1480 de 2011).

9. CONTACTO
Para ejercer sus derechos de Habeas Data: privacidad@luxuryservice.co
`;

export const POLITICA_PRIVACIDAD = `
POLÍTICA DE TRATAMIENTO DE DATOS PERSONALES — LUXURY SERVICE

Versión ${POLITICA_VERSION} | Conforme a Ley 1581 de 2012 y Decreto 1377 de 2013

RESPONSABLE DEL TRATAMIENTO
Luxury Service — Correo: privacidad@luxuryservice.co

DATOS RECOLECTADOS
• Identificación: nombre completo, correo electrónico.
• Transaccionales: historial de citas, compras y preferencias de servicio.
• Técnicos: dirección IP al momento del registro (fines de seguridad y auditoría ISO 27001).

FINALIDADES DEL TRATAMIENTO
1. Prestación del servicio contratado (agendamiento, tienda, perfil).
2. Cumplimiento de obligaciones legales y contables.
3. Seguridad de la plataforma y prevención de fraude.
4. Comunicaciones operativas sobre sus citas o pedidos (no publicidad sin consentimiento adicional).

DERECHOS DEL TITULAR (Art. 8 Ley 1581)
Acceder, conocer, actualizar, rectificar y suprimir sus datos; solicitar prueba de la autorización otorgada; revocarla cuando no exista deber legal; y presentar quejas ante la SIC (www.sic.gov.co).

MEDIDAS DE SEGURIDAD (ISO/IEC 27001)
• Contraseñas: política de complejidad (mín. 8 caracteres, mayúsculas, minúsculas, números y símbolos).
• Almacenamiento: hash irreversible (bcrypt, factor de costo 10).
• Acceso: tokens JWT con expiración; principio de mínimo privilegio por rol.
• Auditoría: registro de consentimientos con fecha, versión de política e IP.
• Retención: datos conservados mientras exista relación contractual o obligación legal; eliminación posterior conforme a política interna.

TRANSFERENCIA Y ENCARGADOS
Los datos pueden ser procesados por proveedores de infraestructura (ej. Cloudflare) bajo acuerdos que garanticen confidencialidad y niveles de protección equivalentes.

CANAL DE CONSULTAS
privacidad@luxuryservice.co — Plazo de respuesta: máximo 10 días hábiles (prorrogables 5 días más según Art. 14 Ley 1581).
`;
