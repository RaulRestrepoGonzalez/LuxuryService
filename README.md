# Luxury Service Manga & M&S

Aplicación web para **detailing automotriz premium** en **Manga, Cartagena**. Catálogo de servicios, agendamiento con pago integrado, dashboard ejecutivo, autenticación passwordless, gift cards y cotizaciones.

## Stack

| Capa | Tecnología | Despliegue |
| Frontend | Angular 21 + Chart.js 4 | Cloudflare Pages |
| Backend API | Express 5 + MongoDB Atlas | VPS / Railway / Render |
| Pasarela de pago | Credibanco Checkout | API externa |
| Correo | Nodemailer (SMTP con cola de reintentos) | Cualquier SMTP |

## Arquitectura

```
ng serve / Cloudflare Pages
  └── llama a → API (Express :3000 o Worker :8787)
       ├── MongoDB (usuarios, citas, servicios, pagos, gift-cards, notificaciones)
       └── Credibanco Checkout (sesiones de pago)
```

El backend recomendado es **Express + MongoDB Atlas** (`server/`). El worker de Cloudflare (`worker/`) existe como alternativa serverless con D1 pero está limitado frente al Express completo.

## Requisitos

- **Node.js 20+**
- **MongoDB Compass** o `mongod` corriendo (para desarrollo con Express)
- **Credenciales de Credibanco** (para pagos reales)
- **SMTP** (para envío de tickets, gift cards y confirmaciones por correo)

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

## Estructura del proyecto

```
src/
├── app/
│   ├── core/
│   │   ├── guards/              # AuthGuard, AdminGuard
│   │   ├── interceptors/        # JWT interceptor
│   │   └── services/            # ApiService (caché 60s), AuthService
│   ├── modules/
│   │   ├── admin/
│   │   │   ├── pages/
│   │   │   │   ├── dashboard/           # Dashboard con gráficas Chart.js
│   │   │   │   ├── appointments-mgmt/   # Gestión de citas admin
│   │   │   │   ├── inventory-mgmt/      # Inventario de productos
│   │   │   │   ├── services-mgmt/       # CRUD de servicios
│   │   │   │   ├── import-data/         # Importación CSV/Excel
│   │   │   │   └── email-settings/      # Configuración SMTP desde admin
│   │   │   ├── admin-routing.module.ts
│   │   │   └── admin.module.ts
│   │   ├── public/
│   │   │   ├── pages/
│   │   │   │   ├── home/                # Landing page
│   │   │   │   ├── services-catalog/    # Catálogo con fallback instantáneo
│   │   │   │   ├── book-appointment/    # Agendar cita + pago
│   │   │   │   ├── shop/               # Tienda de productos
│   │   │   │   ├── auth/               # Login passwordless
│   │   │   │   ├── login/              # Login con contraseña
│   │   │   │   ├── register/           # Registro de clientes
│   │   │   │   ├── gift-card/          # Compra de gift cards
│   │   │   │   ├── cotizacion/         # Solicitar cotización
│   │   │   │   ├── privacy/            # Política de privacidad
│   │   │   │   └── terms/              # Términos y condiciones
│   │   │   └── ...
│   │   └── client/
│   │       ├── pages/
│   │       │   ├── my-appointments/     # Historial de citas del cliente
│   │       │   ├── my-products/         # Productos comprados
│   │       │   └── profile/            # Perfil, notificaciones, consentimiento
│   │       ├── client-routing.module.ts
│   │       └── client.module.ts
│   └── shared/
│       ├── components/
│       │   └── chatbot-floating/       # Widget de chatbot flotante
│       └── constants/
│           ├── servicios.data.ts       # FALLBACK_SERVICIOS (15 servicios)
│           ├── catalog-images.ts       # Imágenes Unsplash por categoría
│           └── legal.constants.ts      # Textos legales (Ley 1581 de 2012)
server/src/
├── index.ts               # Express API (~1500 líneas, todos los endpoints)
├── db.ts                  # Conexión MongoDB + helpers
├── payments.ts            # Integración Credibanco Checkout
├── email.ts               # Nodemailer con cola de reintentos en MongoDB
├── notifications.ts       # Notificaciones en BD
├── chatbot.ts             # Motor de chatbot con detección de intención
├── seed.ts                # Seed de datos iniciales
├── servicios-data.ts      # Datos de servicios para seed (40+)
├── migrate-excel.ts       # Migración de servicios/productos desde Excel/CSV
├── migrate-images.ts      # Asignación de imágenes Unsplash a productos
├── migrate-latoneria.ts   # Consolidación de servicios de latonería
├── migrate-mecanica.ts    # Consolidación de servicios mecánicos
├── migrate-pintura.ts     # Consolidación de servicios de pintura
└── delete-food.ts         # Eliminación de productos de comida/bebida
worker/src/
└── index.ts               # Hono Worker (Cloudflare) — 245 líneas
```

## Módulos del frontend

### Módulo público
- **Catálogo de servicios** — Carga instantánea con `FALLBACK_SERVICIOS`, consulta API en segundo plano. Soporta filtro por búsqueda (antigüe-dad) y toggle por tipo de vehículo (auto/camioneta/moto).
- **Agendamiento** — Selección de servicio → fecha → horario → pago con Credibanco. El servidor genera QR y envía ticket por email.
- **Gift cards** — Compra de tarjetas de regalo por montos fijos ($50k, $80k, $140k, $200k). Se entregan con código único (GC-XXXXXXXX) y QR.
- **Cotización** — Servicios con flag `cotizar_local: true` (pintura, mecánica general, latonería) redirigen a formulario de cotización local.
- **Tienda** — Compra de productos de detailing.
- **Chatbot flotante** — Responde preguntas sobre servicios, precios, horarios y ubicación. Detecta tipo de vehículo y navega a secciones.

### Módulo admin
- **Dashboard** — Gráficas Chart.js: ingresos vs egresos, citas por estado, servicios top, crecimiento de clientes. Tarjetas de métricas. Exportación Power BI.
- **Gestión de citas** — CRUD de citas, cambio de estados, filtros.
- **Inventario** — Productos con stock crítico.
- **Servicios** — CRUD completo, activación/desactivación.
- **Importación** — Subida de CSV/Excel con mapeo de columnas.
- **Email settings** — Configuración SMTP desde la interfaz (host, puerto, usuario, contraseña).

### Módulo cliente
- **Mis citas** — Historial de citas del usuario autenticado.
- **Mis productos** — Compras realizadas.
- **Perfil** — Email, número de servicios, notificaciones, opciones de cuenta (revocar consentimiento, eliminar cuenta).

## Flujo de agendamiento con pago

1. Cliente selecciona servicio → fecha → horario → **Confirmar cita**
2. Servidor:
   - Calcula total = `precio_servicio + $10.000` (recargo por reserva online)
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

## Sistema de correos

El módulo `server/src/email.ts` implementa:
- **Transporter SMTP** configurable vía variables de entorno.
- **Cola de reintentos** — los emails fallidos se almacenan en MongoDB (`cola_email`) y se reintentan automáticamente.
- **Tipos de email**: ticket de cita (con QR adjunto), confirmación de pago, bienvenida, gift card (con código y QR), notificaciones de cancelación.
- **DKIM** — soporte para firmado DKIM si se configuran las claves.

## Gift cards

- **Compra**: `POST /api/gift-cards/purchase` — montos disponibles: $50k, $80k, $140k, $200k.
- **Entrega**: al confirmarse el pago vía webhook, se genera un código único `GC-XXXXXXXX`, se almacena en MongoDB y se envía al email del comprador con su QR.
- **Canje manual** desde el panel admin (no implementado en frontend).

## Chatbot

El chatbot (`chatbot.ts` + `chatbot-floating.component.ts`) responde en lenguaje natural sobre:
- **Servicios disponibles** — lista por categoría con precios según tipo de vehículo.
- **Precios** — "¿cuánto cuesta un lavado básico para camioneta?"
- **Horarios y dirección** — horario de atención (lunes a sábado), ubicación en Manga.
- **Cotizaciones** — redirige a `/cotizacion` para servicios que requieren presupuesto local (pintura, mecánica, latonería).
- **Navegación** — botones de acceso rápido a catálogo, agendamiento, gift cards.

Cachea el catálogo de servicios cada 5 minutos para respuestas rápidas.

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

## API endpoints principales

### Auth
| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| GET | `/api/auth/check-email` | — | Verifica si el email existe y si es admin |
| POST | `/api/auth/client-access` | — | Acceso passwordless para clientes |
| POST | `/api/auth/client-register` | — | Registro de cliente nuevo |
| POST | `/api/auth/login` | — | Login admin con contraseña |
| GET | `/api/auth/me` | ✓ | Datos del usuario autenticado |

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

### Gift cards
| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| POST | `/api/gift-cards/purchase` | ✓ | Comprar gift card (genera checkout + QR) |
| GET | `/api/gift-cards/validate/:code` | — | Validar código de gift card |
| POST | `/api/gift-cards/redeem` | admin | Canjear gift card |

### Pagos
| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| POST | `/api/payments/webhook` | — | Webhook de Credibanco |
| GET | `/api/payments/qr` | — | Genera QR en PNG desde URL |

### Chatbot
| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| POST | `/api/chatbot` | — | Respuesta del chatbot (mensaje + contexto) |

### Contacto
| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| POST | `/api/contact` | — | Formulario de contacto |

### Notificaciones
| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| GET | `/api/notifications` | ✓ | Notificaciones del usuario |
| PUT | `/api/notifications/:id/read` | ✓ | Marcar como leída |

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
| PUT | `/api/admin/services/:id` | admin | Actualizar servicio |
| POST | `/api/admin/services` | admin | Crear servicio |
| POST | `/api/admin/import` | admin | Importar datos desde CSV/Excel |
| GET/PUT | `/api/admin/email-settings` | admin | Ver y actualizar configuración SMTP |

## Migraciones

El servidor incluye varios scripts de migración en `server/src/`:

```bash
cd server && npx tsx src/migrate-excel.ts      # Importar servicios desde Excel
cd server && npx tsx src/migrate-latoneria.ts  # Consolidar servicios de latonería
cd server && npx tsx src/migrate-mecanica.ts   # Consolidar servicios mecánicos
cd server && npx tsx src/migrate-pintura.ts    # Consolidar servicios de pintura
cd server && npx tsx src/migrate-images.ts     # Asignar imágenes Unsplash a productos
cd server && npx tsx src/delete-food.ts        # Eliminar productos de comida/bebida
```

## Despliegue

### Frontend → Cloudflare Pages

```bash
# 1. Construir para Pages (genera solo browser/)
npm run build:pages

# 2. Desplegar a Cloudflare Pages
npm run pages:deploy
# O manualmente: npx wrangler pages deploy dist/LuxuryService/browser --branch production
```

### Backend → Express + MongoDB Atlas

El backend Express se despliega en cualquier servicio que soporte Node.js (Railway, Render, Fly.io, VPS).

```bash
# 1. Compilar TypeScript
cd server && npm run build

# 2. Configurar variables de entorno
# Copiar server/.env.example → server/.env y llenar:
#   MONGODB_URI     → URI de MongoDB Atlas
#   JWT_SECRET      → openssl rand -hex 32
#   SMTP_*          → credenciales de correo
#   BASE_URL        → https://luxuryservice.co

# 3. Iniciar servidor
node dist/index.js
```

> La variable `apiUrl` en producción se configura automáticamente desde `window.__env.apiUrl`
> (definido en el dashboard de Pages) o por defecto apunta a `https://api.luxuryservice.co/api`.
>
> Para configurarlo en Cloudflare Pages: **Settings → Environment variables** → agregar
> `__env` con valor `{"apiUrl":"https://tu-servidor.com/api"}`.

### Worker (alternativo)

El worker `worker/` con Hono + D1 existe como alternativa serverless pero no tiene todas
las funcionalidades del Express (pagos, email, gift cards, importación). Solo se recomienda
para funcionalidad básica.

## Convenciones de desarrollo

- **Carga instantánea**: los servicios se muestran desde `FALLBACK_SERVICIOS` en el constructor (15 servicios con precios 2026), la API se consulta en segundo plano. El usuario nunca ve un spinner de carga en el catálogo ni en el agendamiento.
- **Admin sin API**: `admin@luxuryservice.co` se detecta localmente, no necesita que el servidor esté corriendo para mostrar el formulario de contraseña.
- **Precios por tipo de vehículo**: auto, camioneta y moto tienen precios diferenciados en cada servicio.
- **Caché por valor**: `ApiService` usa caché por valor (no por Observable) con TTL de 60s. Los errores eliminan la entrada de caché.
- **Timeout**: todas las requests HTTP tienen timeout de 8 segundos.
- **Chart.js**: las gráficas del dashboard se renderizan con Chart.js directamente sobre canvas (sin wrapper), se destruyen al salir del componente.
- **Sin comentarios en código**: el código fuente no lleva comentarios. Este README es la única documentación.
- **Precios con IVA incluido**: todos los precios en la base de datos y fallback incluyen IVA.
- **Consentimiento de datos**: cumplimiento Ley 1581 de 2012 (Colombia) — registro de auditoría para aceptación/revocación de consentimiento.
- **Componentes standalone**: todos los componentes del frontend son standalone (Angular 21), no dependen de NgModules funcionales.

## Scripts disponibles

| Script | Descripción |
|---|---|
| `npm run dev` | Arranca servidor Express + Angular simultáneamente |
| `npm run server` | Solo servidor Express en puerto 3000 |
| `npm run server:seed` | Ejecuta seed de base de datos |
| `npm run build` | Construye frontend para producción (con SSR) |
| `npm run build:pages` | Construye frontend para Cloudflare Pages (solo browser/) |
| `npm run pages:deploy` | Despliega a Cloudflare Pages |
| `npm run server` | Solo servidor Express en puerto 3000 |
| `npm run server:seed` | Ejecuta seed de base de datos |
| `npm test` | Ejecuta pruebas unitarias |

## Licencia

Uso interno — Luxury Service Manga & M&S.
