# 03 · API que usa el sitio

El backend del sitio es el panel de DepaHost (`DH_panel`, Next.js en Vercel). Expone bajo `/api`
solo las rutas que el sitio necesita. Cómo funciona el panel por dentro (base, usuarios, WhatsApp)
está en `DH_panel/README.md` y `DH_panel/docs/`.

## 1. El contrato

- **Fuente de verdad:** `openapi/depahost-api.json`, en este repo. Describe lo que el sitio envía
  y espera recibir. El panel lo implementa a mano.
- El archivo heredó muchas rutas que ya no existen (cuentas, administración, inmobiliarias…). El
  sitio no las usa; solo importan las de la tabla de abajo.
- `pnpm api:types` regenera `src/lib/api/schema.d.ts` desde el contrato.
- `pnpm api:mock` levanta una API falsa con Prism en `http://127.0.0.1:4010`.

| Variable | Dónde | Valor |
|---|---|---|
| `API_URL` | Build | `https://<dominio del panel>/api` (local: `http://localhost:3000/api`) |
| `PUBLIC_API_URL` | Navegador | Lo mismo. Los formularios llaman ahí directamente |

## 2. Rutas

| Ruta | Quién la llama | Estado en el panel |
|---|---|---|
| `GET /v1/properties?page&pageSize` | El build (`src/content.config.ts`) | Implementada |
| `POST /v1/leads` | Formularios del navegador | Implementada |
| `POST /v1/complaints` | Libro de Reclamaciones | **Falta** |

### `GET /v1/properties`

Código: `DH_panel/app/api/v1/properties/route.ts`. El build pagina de 100 en 100 hasta leer
`total`. Si la respuesta falla, el build falla a propósito.

- Datos: la función `inmuebles_web` de Supabase, es decir, inmuebles **En cartera** con
  autorización para publicar.
- Siempre `origin: 'owner'` y `developer: null`. El panel no envía proyectos de inmobiliarias.
- `address` es el tipo de inmueble, nunca la dirección exacta. `location: null`, `videos: []`,
  `yearBuilt: null`, `badge: null`, `status: 'published'`, precio en PEN.
- Fotos: URLs firmadas de Supabase Storage (bucket `inmuebles`), válidas 6 horas. Astro las
  descarga y optimiza en el build; requiere `PUBLIC_MEDIA_HOST=<proyecto>.supabase.co`.
- Cabecera `Cache-Control: s-maxage=300, stale-while-revalidate=600`. Problema conocido: un
  rebuild inmediato puede leer el catálogo viejo.

### `POST /v1/leads`

Código: `DH_panel/app/api/v1/leads/route.ts`. Cuerpo: `LeadCreateInput`. Respuesta `201`
con `{ id, createdAt }`; errores `400` con la forma `ApiError` (`issues[].path` marca el campo).

| `source` | Qué es | Se registra |
|---|---|---|
| `saved-list` | "Guarda tus inmuebles" | Sí |
| `cart` | "Conversemos ahora" o "Programar una sesión" de Mis inmuebles | Sí |
| `contact` | Contacto | Sí |
| `intl-form` | Formulario en inglés | Sí |
| `owner-sell` | Propietario que quiere vender | Sí |
| `owner-rent` | Propietario que quiere alquilar | No: responde `201` y no guarda nada |

Reglas:

- Valida nombre, celular (obligatorio si hay nombre), correo, `propertyIds` (UUID, máx. 20),
  `details` y `utm`.
- Registra con la función `registrar_lead_web`: crea o une el lead (canal Web) en el panel. Sin
  celular solo guarda el interés por los inmuebles.
- Sin límite de envíos por IP (pendiente).

### `POST /v1/complaints` (pendiente)

El panel no tiene esta ruta. Hoy el formulario de `/libro-de-reclamaciones` muestra un error y
ofrece WhatsApp. Es un pendiente legal: INDECOPI pide código correlativo y constancia.

Lo que el sitio ya envía (`ComplaintCreateInput`):

| Campo | Contenido |
|---|---|
| `consumer` | `firstName`, `lastName`, `documentType` (`DNI`, `CE`, `PASAPORTE`, `RUC`), `documentNumber`, `address`, `phone`, `email`, `isMinor`, `guardianName` (si es menor) |
| `item` | `type` (`producto` o `servicio`), `description`, `amount` en soles (opcional) |
| `kind` | `reclamo` (producto o servicio) o `queja` (atención) |
| `detail`, `request` | Detalle del reclamo y pedido del consumidor |
| `consent` | Siempre `true` |
| `turnstileToken`, `website` | Anti-bots y honeypot, igual que en leads |

Lo que el sitio espera recibir:

- `201` con `ComplaintReceipt`: `code` (correlativo, p. ej. `LR-2026-000001`), `createdAt` y
  `responseDeadline` (fecha límite, 15 días hábiles). La página muestra el código, la fecha y
  el botón "Imprimir constancia". El texto de la página dice que se envía copia por correo.
- `400` con `ApiError` e `issues[].path` con puntos (`consumer.email`) para marcar cada campo.
- `429` si hay demasiados envíos.

## 3. Seguridad

| Medida | Cómo funciona |
|---|---|
| CORS | Solo para los orígenes de `WEB_ORIGINS` (variable del panel), con `allow-credentials` |
| Turnstile | Si el envío trae celular y el panel tiene `TURNSTILE_SECRET_KEY`, verifica el token. El sitio lo agrega con `PUBLIC_TURNSTILE_SITE_KEY` |
| Honeypot | Si el campo oculto `website` viene lleno, responde `201` sin registrar |

## 4. Publicar en la web (deploy hook)

1. En el panel: Inmuebles → Nuevo inmueble (propietario + inmueble + contrato). Queda En cartera.
2. Subir las fotos en la ficha del inmueble.
3. Pulsar **"Actualizar web"**. El panel llama a `CLOUDFLARE_DEPLOY_HOOK_URL` y Cloudflare
   reconstruye el sitio (unos 2 minutos).

Variables del panel que tocan al sitio: `WEB_ORIGINS`, `TURNSTILE_SECRET_KEY`,
`CLOUDFLARE_DEPLOY_HOOK_URL`.

## 5. Cómo cambiar el contrato

1. Editar `openapi/depahost-api.json`.
2. Correr `pnpm api:types`. TypeScript marca en el sitio lo que hay que ajustar.
3. Ajustar la ruta en `DH_panel/app/api/v1/…` para que responda lo mismo.
