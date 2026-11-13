# Depa Host Perú · sitio web

Sitio de **Depa Host Perú** (depahostperu.com): reservar estadías, vender o alquilar tu inmueble,
y **DepaHost Capital** (comprar inmuebles en Lima para que rindan).

Esta app es solo el **frontend estático**. El backend es el **panel de DepaHost** (Next.js + Supabase),
que expone `/api/v1/properties` y `/api/v1/leads` con la forma del contrato `openapi/depahost-api.json`.
Los inmuebles de propietarios se registran en el panel; Capital (inmobiliarias aliadas, sus proyectos y los
supuestos de financiamiento) vive solo en este repo, en `src/content/*.json`.
Los repos `depahost-api` y `depahost-panel` quedaron reemplazados por el panel.

## Documentación

La documentación completa de la plataforma (arquitectura, frontend, API, datos y cada flujo
con diagramas UML) está en [docs/plataforma](docs/plataforma/README.md).

## Stack

- [Astro](https://astro.build) 7, sitio 100 % estático
- CSS propio con variables (tokens de diseño), sin frameworks de CSS
- Fuente Poppins (la de depahostperu.com) autoalojada con la API de fuentes de Astro
- Datos con Astro Content Layer: JSON local o la API, según `API_URL`
- Cliente HTTP tipado (`openapi-fetch`) generado desde el contrato de la API
- Node 24 + pnpm · Vitest · Playwright · Prettier · GitHub Actions

## Comandos

| Comando         | Qué hace                                                              |
| --------------- | --------------------------------------------------------------------- |
| `pnpm install`  | Instala las dependencias                                              |
| `pnpm dev`      | Servidor de desarrollo en `http://localhost:4321`                     |
| `pnpm build`    | Construye el sitio final en `dist/`                                   |
| `pnpm preview`  | Sirve `dist/` para revisarlo antes de publicar                        |
| `pnpm preprod`  | Build con `.env.preprod` (lee el API de preproducción) y vista previa |
| `pnpm check`    | Revisa tipos de TypeScript y de los `.astro`                          |
| `pnpm test`     | Pruebas unitarias (Vitest)                                            |
| `pnpm test:e2e` | Pruebas en navegador (Playwright, escritorio y móvil)                 |
| `pnpm format`   | Formatea el código con Prettier                                       |
| `pnpm api:sync` | Copia el contrato de la API y regenera los tipos del cliente          |
| `pnpm api:mock` | API falsa en `http://127.0.0.1:4010` a partir del contrato (Prism)    |

## Configuración

Cada entorno tiene su archivo de ejemplo: `.env.example` → `.env` (desarrollo),
`.env.preprod.example` → `.env.preprod` (preproducción local, con `pnpm preprod`) y
`.env.production.example` (lo que va en el panel del hosting). En desarrollo, el sitio lee los inmuebles
de `src/content/*.json` y envía formularios y cuentas al API local (`http://localhost:3000`).
Ver los entornos en [docs/plataforma/06](docs/plataforma/06-desarrollo-y-operacion.md#2-entornos).

Variables principales:

| Variable                    | Para qué                                                                                  |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| `PUBLIC_WHATSAPP_NUMBER`    | Número de todos los botones de WhatsApp                                                   |
| `PUBLIC_API_URL`            | API que reciben los formularios en el navegador. Vacío = los formularios ofrecen WhatsApp |
| `API_URL`                   | API de la que el build lee los inmuebles. Vacío = usa `src/content/*.json`                |
| `PUBLIC_TURNSTILE_SITE_KEY` | Anti-spam de Cloudflare en los formularios                                                |
| `PUBLIC_CLARITY_ID`         | Analítica; solo se carga si la persona acepta cookies                                     |
| `PUBLIC_MEDIA_HOST`         | Dominio de las fotos de la API, para optimizarlas                                         |
| `PUBLIC_SENTRY_DSN`         | Errores del navegador (opcional)                                                          |
| `PUBLIC_PANEL_URL`          | Panel de cuentas. Vacío = no se muestra "Ingresar"                                        |

En producción, `API_URL` y `PUBLIC_API_URL` apuntan a la misma API. Si la API no responde
durante el build, el build falla a propósito para no publicar datos viejos.

## Cómo fluyen los datos

```text
Panel (/api) ──GET /v1/properties──▶ src/content.config.ts ──▶ src/lib/properties.ts ──▶ páginas
        ▲                                   (o src/content/*.json)
        │ POST /v1/leads
navegador (src/scripts/forms.ts)
```

- Las páginas **solo** leen datos con `src/lib/properties.ts`.
- Cada inmueble tiene un origen: **de propietario** (portada de Capital) o **de proyecto** de una
  inmobiliaria aliada (página `/capital/aliados/{slug}`).
- "Para ti, según lo que has visto" y "Inmuebles similares" salen de `src/lib/recommend.ts`, con el
  historial de inmuebles abiertos y Mis inmuebles guardados en el navegador.
- "Guarda tus inmuebles" pide nombre y celular al guardar el segundo inmueble y crea un lead
  `saved-list` en la API. Solo el primer nombre queda en el navegador para saludar ("Hola, Ana").
- "Mis inmuebles" se guarda en el navegador (`src/lib/saved-store.ts`) y se pinta con
  `/data/properties.json`, un catálogo liviano generado en el build.
- Al publicar o editar un inmueble, la API llama al deploy hook del hosting y el sitio se reconstruye.

## Estructura

```text
src/
├── components/     piezas reutilizables (Header, PropertyCard, OwnerForm, ConsentBanner…)
├── content/        datos locales (properties.json, financing.json) cuando no hay API
├── content.config.ts  esquema de los datos (refleja la respuesta de la API)
├── data/           contacto (WhatsApp) y datos legales de la empresa
├── layouts/        BaseLayout, LegalLayout, PlaceholderLayout
├── lib/
│   ├── api/        cliente HTTP tipado, tipos generados y loaders del build
│   ├── filters.ts  búsqueda y filtros (funciones puras, con tests)
│   ├── format.ts   formatos de moneda, rentabilidad y fechas
│   ├── properties.ts  única puerta a los datos de depas e inmobiliarias
│   ├── recommend.ts   recomendaciones y depas similares (con tests)
│   ├── profile.ts     nombre para el saludo y control del aviso "Guarda tus depas"
│   └── saved-store.ts "Mis depas" e historial de depas vistos
├── pages/          una página por archivo:
│                   capital/index (portada), capital/[slug] (detalle), capital/aliados/[slug]
│                   (proyectos de una inmobiliaria), capital/empecemos (Te acompañamos),
│                   mis-inmuebles, propietarios
├── scripts/        JS del navegador (formularios, consentimiento, botones de guardado)
└── styles/         tokens.css y global.css
tests/unit, tests/e2e   Vitest y Playwright
openapi/            copia del contrato de la API
```

## Pendientes (contenido y datos reales)

| Qué                                                      | Dónde                                                    |
| -------------------------------------------------------- | -------------------------------------------------------- |
| Número de WhatsApp real                                  | `PUBLIC_WHATSAPP_NUMBER`                                 |
| Razón social, RUC y dirección fiscal                     | `src/data/empresa.ts` y variables `COMPANY_*` de la API  |
| Revisión legal de privacidad y términos (son borradores) | `src/pages/privacidad.astro`, `src/pages/terminos.astro` |
| Supuestos de la cuota estimada                           | `src/content/financing.json`                             |
| Fotos de los inmuebles                                   | Ficha del inmueble en el panel                           |
| Logos de aliados                                         | `src/pages/capital/index.astro`                          |
| Páginas Estadías y Nosotros (siguen en construcción)     | `src/pages/`                                             |
| Versión en inglés del sitio                              | Selector EN deshabilitado en `LangSwitch.astro`          |
