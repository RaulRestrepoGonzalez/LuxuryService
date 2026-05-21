# 🚗 Luxury Service Manga & M&S

Aplicación web para **detailing automotriz premium** en **Manga, Cartagena**. Catálogo de servicios, agendamiento con pago integrado, dashboard ejecutivo y autenticación de clientes passwordless.

## Stack

| Capa | Tecnología | Despliegue |
|---|---|---|
| Frontend | Angular 21 + Chart.js | Cloudflare Pages |
| Backend API | Express + MongoDB | Servidor propio / VPS |
| Worker API | Hono + D1 (Cloudflare) | Cloudflare Workers |
| Pasarela de pago | Credibanco Checkout | Según credenciales |
| Correo | Nodemailer (SMTP) | Cualquier SMTP |

## Arquitectura

```
ng serve / Cloudflare Pages
  └── llama a → API (Express :3000 o Worker :8787)
       ├── MongoDB (usuarios, citas, servicios, pagos)
       └── Credibanco Checkout (sesiones de pago)
```

La app tiene **dos backends paralelos**:
- **`server/`** — Express + MongoDB, para desarrollo local
- **`worker/`** — Hono + Cloudflare D1, para producción en Cloudflare Workers

Ambos exponen los mismos endpoints (auth, servicios, citas, pagos, dashboard).

## Requisitos

- **Node.js 20+**
- **MongoDB Compass** o `mongod` corriendo (para desarrollo con Express)
- **Credenciales de Credibanco** (para pagos reales)
- **SMTP** (para envío de tickets por correo)

## Inicio rápido (desarrollo)

```bash
npm run dev
# Arranca: Express API (puerto 3000) + Angular (puerto 4200)
```

O por separado:
```bash
cd server && npm run dev    # API :3000
ng serve                    # Frontend :4200
```

### Seed de datos de prueba

```bash
cd server && npm run seed
# Crea: admin, 18 servicios, 3 productos
# Admin: admin@luxuryservice.co / Admin123!
```

## Estructura del proyecto

```
src/
├── app/
│   ├── core/
│   │   ├── guards/           # AuthGuard, AdminGuard
│   │   ├── interceptors/     # JWT interceptor
│   │   └── services/         # ApiService, AuthService
│   ├── modules/
│   │   ├── admin/
│   │   │   ├── pages/
│   │   │   │   ├── dashboard/      # Dashboard con gráficas
│   │   │   │   ├── appointments-mgmt/
│   │   │   │   ├── inventory-mgmt/
│   │   │   │   └── services-mgmt/
│   │   │   ├── admin-routing.module.ts
│   │   │   └── admin.module.ts
│   │   └── public/
│   │       ├── pages/
│   │       │   ├── auth/              # Login passwordless
│   │       │   ├── book-appointment/  # Agendar cita + pago
│   │       │   ├── services-catalog/  # Catálogo con fallback
│   │       │   ├── home/
│   │       │   └── shop/
│   │       └── shared/
│   │           ├── components/
│   │           └── constants/
│   └── shared/constants/
│       ├── servicios.data.ts      # FALLBACK_SERVICIOS (18 servicios)
│       ├── catalog-images.ts
│       └── legal.constants.ts
server/src/
├── index.ts               # Express API (todos los endpoints)
├── db.ts                  # Conexión MongoDB
├── payments.ts            # Integración Credibanco
├── email.ts               # Envío de tickets (Nodemailer)
├── notifications.ts       # Notificaciones en BD
├── chatbot.ts             # Chatbot simple
├── seed.ts                # Seed de datos
└── servicios-data.ts      # Datos de servicios
worker/src/
└── index.ts               # Hono Worker (Cloudflare)
```

## Flujo de agendamiento con pago

1. Cliente selecciona servicio → fecha → horario → **Confirmar cita**
2. Servidor:
   - Calcula total = `precio_servicio + $10,000` (recargo por reserva online)
   - Crea cita con estado `pendiente_pago`
   - Crea registro en colección `pagos`
   - Llama a **Credibanco Checkout** → obtiene URL de pago
   - Genera **código QR** con la URL de pago
   - Envía **email al cliente** con ticket + QR adjunto
3. Cliente ve QR en pantalla y recibe email
4. Cliente paga escaneando QR o haciendo clic
5. Credibanco envía **webhook** a `/api/payments/webhook`
6. Servidor marca cita como `confirmada` y pago como `pagado`
7. Se envía email de confirmación

## Configuración de entorno

### `server/.env`

```env
# MongoDB
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=luxury_service
JWT_SECRET=dev-luxury-secret-cambiar-en-produccion
PORT=3000

# Credibanco Checkout
CREDIBANCO_MERCHANT_ID=
CREDIBANCO_API_KEY=
CREDIBANCO_API_URL=https://api.credibanco.com/checkout/v1/sessions
CREDIBANCO_WEBHOOK_SECRET=

# SMTP para tickets por correo
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=notificaciones@luxuryservice.co
SMTP_FROM_NAME=Luxury Service Manga

# URL base (para enlaces en correos)
BASE_URL=http://localhost:4200
```

> Sin credenciales de Credibanco ni SMTP, el sistema funciona en modo simulado:
> el QR y URL de pago se generan, el ticket se muestra en consola del servidor.

## Integración Credibanco

El módulo `server/src/payments.ts` implementa:

- **`createCheckout(params)`** — Crea una sesión de pago en Credibanco Checkout
  - `amount`: monto en COP
  - `description`: descripción del cobro
  - `returnUrl`: URL de retorno post-pago
  - `webhookUrl`: URL para notificación de estado
  - `customerEmail`: email del cliente
  - Retorna: `{ sessionId, checkoutUrl, reference }`

- **`processWebhook(body)`** — Verifica y procesa el webhook de Credibanco
  - Verifica firma HMAC-SHA256
  - Retorna: `{ valid, payload }`

- **`POST /api/payments/webhook`** — Endpoint que recibe el webhook
  - `APPROVED` → actualiza cita a `confirmada`, envía email
  - `DECLINED` → marca pago como `rechazado`

- **`GET /api/payments/qr?url=...`** — Genera imagen PNG del QR

### Credenciales necesarias (producción)

Para producción, Credibanco entrega:
- **Merchant ID** (identificador del comercio)
- **API Key** (llave para autenticación REST)
- **Webhook Secret** (para verificar firmas HMAC)
- **API URL** (entorno de producción)

## Dashboard ejecutivo

Accesible en `/admin/dashboard` con rol admin.

### Gráficas (Chart.js)

| Gráfica | Tipo | Datos |
|---|---|---|
| Ingresos vs Egresos | Barras agrupadas | Evolución mensual |
| Citas por estado | Dona (doughnut) | Pendiente, confirmada, completada, cancelada |
| Servicios más reservados | Barras horizontales | Top 8 servicios |
| Crecimiento de clientes | Línea con área | Nuevos registros por mes |
| Citas por mes | Línea | Volumen de agendamiento |
| Stock crítico | Barras horizontales | Productos con stock < 10 |

### Tarjetas de métricas

- Ingresos totales (con tendencia y margen %)
- Egresos totales
- Clientes registrados
- Citas totales (con tasa de completadas)
- Servicios activos
- Productos en catálogo

### Exportación Power BI

`GET /api/admin/dashboard/powerbi` retorna JSON con 5 tablas:
- `transacciones` — ingresos y egresos
- `citas` — con datos de cliente y servicio
- `usuarios` — todos los usuarios
- `productos` — inventario
- `servicios` — catálogo

Desde Power BI Desktop ir a **Obtener datos → Web** e ingresar la URL del endpoint.

## API endpoints principales

### Auth
| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| GET | `/api/auth/check-email` | — | Verifica si el email existe y si es admin |
| POST | `/api/auth/client-access` | — | Acceso passwordless para clientes |
| POST | `/api/auth/client-register` | — | Registro de cliente nuevo |
| POST | `/api/auth/login` | — | Login admin con contraseña |

### Servicios y productos
| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| GET | `/api/services` | — | Lista de servicios |
| GET | `/api/services/catalog` | — | Servicios agrupados por categoría |
| GET | `/api/products` | — | Productos en venta |
| POST | `/api/purchase` | ✓ | Registrar compra |

### Citas
| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| GET | `/api/appointments/available` | — | Horarios disponibles para una fecha |
| GET | `/api/appointments/calendar` | — | Calendario con días ocupados |
| POST | `/api/appointments` | ✓ | Crear cita (genera pago + QR) |
| GET | `/api/appointments/my` | ✓ | Citas del usuario autenticado |
| PUT | `/api/appointments/:id/cancel` | ✓ | Cancelar cita |

### Pagos
| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| POST | `/api/payments/webhook` | — | Webhook de Credibanco |
| GET | `/api/payments/qr` | — | Genera QR en PNG desde URL |

### Dashboard admin
| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| GET | `/api/admin/dashboard/analytics` | admin | Revenue trend, citas por estado, clientes, servicios |
| GET | `/api/admin/dashboard/stats` | admin | Total ingresos y egresos |
| GET | `/api/admin/dashboard/product-sales` | admin | Ventas por producto |
| GET | `/api/admin/dashboard/powerbi` | admin | Datos estructurados para Power BI |
| GET | `/api/admin/dashboard/export` | admin | CSV de transacciones |
| GET | `/api/admin/appointments` | admin | Todas las citas con datos de cliente/servicio |
| PUT | `/api/admin/appointments/:id/status` | admin | Actualizar estado de cita |

## Despliegue a Cloudflare

```bash
# 1. Construir frontend
ng build

# 2. Desplegar worker
cd worker && npm run deploy

# 3. Subir dist/ a Cloudflare Pages
#    O desde la terminal:
npx wrangler pages deploy dist/luxury-service/browser
```

> ⚠️ Para el worker de Cloudflare, la integración de pagos y email
> requiere implementar los mismos módulos (`payments.ts`, `email.ts`)
> usando `fetch()` y servicios HTTP en lugar de librerías Node.js.

## Convenciones de desarrollo

- **Carga instantánea**: los servicios se muestran desde `FALLBACK_SERVICIOS` en el constructor, la API se consulta en segundo plano. El usuario nunca ve un spinner de carga en el catálogo ni en el agendamiento.
- **Admin sin API**: `admin@luxuryservice.co` se detecta localmente, no necesita que el servidor esté corriendo para mostrar el formulario de contraseña.
- **Caché por valor**: `ApiService` usa caché por valor (no por Observable) con TTL de 60s. Los errores eliminan la entrada de caché.
- **Timeout**: todas las requests HTTP tienen timeout de 8 segundos.
- **Chart.js**: las gráficas del dashboard se renderizan con Chart.js directamente sobre canvas (sin wrapper), se destruyen al salir del componente.
- **Sin comentarios en código**: el código fuente no lleva comentarios. Este README es la única documentación.

## Licencia

Uso interno — Luxury Service Manga & M&S.
