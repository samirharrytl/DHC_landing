# 02 · Frontend (`DHC_landing`)

## 1. Estructura de carpetas

```text
DHC_landing/
├── astro.config.mjs        sitio, fuentes, variables de entorno, sitemap, redirecciones, fotos remotas
├── wrangler.jsonc          Worker de Cloudflare que sirve dist/
├── openapi/                contrato depahost-api.json (fuente de verdad, ver 03 · API)
├── public/                 _headers, robots.txt, favicon, imagen Open Graph
├── src/
│   ├── content.config.ts   colecciones de datos y su esquema (refleja el API)
│   ├── content/            properties.json y developers.json vacíos, financing.json sin valores
│   ├── assets/             logo y foto del hero (Astro las optimiza en el build)
│   ├── data/               datos fijos: contacto (WhatsApp), empresa (RUC), distritos, lugares
│   ├── layouts/            BaseLayout, LegalLayout, PlaceholderLayout
│   ├── components/         piezas de interfaz (.astro)
│   ├── pages/              una página por archivo (rutas del sitio)
│   ├── lib/                lógica compartida (build y navegador), con pruebas
│   │   └── api/            cliente HTTP, tipos generados y loaders del build
│   ├── scripts/            JavaScript que solo corre en el navegador
│   ├── styles/             tokens.css y global.css
│   └── types/              tipos derivados del esquema (Property, Developer…)
├── tests/unit              Vitest
├── tests/e2e               Playwright, con su catálogo de ejemplo en tests/e2e/catalogo
└── docs/                   esta documentación y la guía de CSS
```

**Regla de capas:** las páginas solo leen datos con `src/lib/properties.ts`. Nunca importan
`src/content/*.json` ni llaman al API directamente en el build.

## 2. Diagrama de módulos (UML de clases)

Cada "clase" es un módulo de TypeScript. Las flechas indican quién usa a quién.

```mermaid
classDiagram
    direction LR

    class content_config {
        <<module>>
        properties: Collection
        developers: Collection
        financing: Collection
    }
    class loaders {
        <<module>>
        hybridLoader(options) Loader
        fetchJson(url) T
    }
    class properties {
        <<module>>
        getProperties(filters?) Property[]
        getOwnerProperties() Property[]
        getPropertyBySlug(slug) Property
        getFastFilters(list?) FastFilter[]
        getDevelopers() Developer[]
        getDeveloperProjects(id) Property[]
        getFinancingAssumptions() FinancingAssumptions
    }
    class filters {
        <<module>>
        matchesFilters(p, query, filters) boolean
        parseFilters(active) PropertyFilters
        buildFastFilters(list) FastFilter[]
    }
    class catalog_search {
        <<module>>
        matchesQuery(d, query) boolean
        sortDepas(list, sort) T[]
        queryFromParams(params) DepaQuery
        paginate(total, page) PageSlice
    }
    class format {
        <<module>>
        formatMoney(amount, currency) string
        formatYield(range) string
        formatDate(iso) string
        normalizeText(s) string
    }
    class saved_store {
        <<module>>
        createIdListStore(storage, events, opts) IdListStore
        getSavedStore() IdListStore
        getHistoryStore() IdListStore
    }
    class profile {
        <<module>>
        firstNameOf(name) string
        getProfileStore() ProfileStore
    }
    class api_client {
        <<module>>
        api: OpenApiClient
        apiConfigured: boolean
    }
    class forms {
        <<module>>
        enhanceForm(form, options)
        formToObject(form) object
        getUtm() object
    }
    class catalog {
        <<module>>
        loadCatalog() CatalogItem[]
    }

    content_config --> loaders : solo properties
    content_config ..> api_client : tipos del contrato
    properties --> content_config : getCollection
    properties --> filters
    filters --> format
    catalog_search --> format
    forms --> api_client
```

## 3. Páginas

Para cada página: de dónde salen sus datos en el build y qué scripts corren en el navegador.

| Ruta | Archivo | Datos del build | Scripts en el navegador |
|---|---|---|---|
| `/` | `pages/index.astro` | Ninguno (texto fijo y foto del hero) | Dropdown "Soy propietario" |
| `/capital` | `pages/capital/index.astro` | `getOwnerProperties`, `getProperties` (total), `getFastFilters` | Filtros y Me interesa |
| `/capital/inmuebles` | `pages/capital/inmuebles.astro` | `getProperties` (todos) | Búsqueda con facetas, orden y conteos (`lib/catalog-search.ts`); los filtros quedan en la URL. "Cerca de": ubicación del navegador (no va a la URL) o un lugar de `data/lugares.ts` (`?cerca=larcomar&km=2`), orden "Más cercanos" y distancia en cada tarjeta (`lib/geo.ts`). "Lista \| Mapa" (`?vista=mapa`): pines con el precio en Leaflet (`scripts/depas-map.ts`), que se descarga al elegir "Mapa". La lista va en páginas de 12 (`?pagina=2`) |
| `/capital/{slug}` | `pages/capital/[slug].astro` | Una página por inmueble de `getProperties` | Galería con fotos y videos (`PropertyGallery`), Me interesa; guarda la visita en el historial. "Contactar" lleva a `/mis-inmuebles?agregar={id}` |
| `/capital/aliados/{slug}` | `pages/capital/aliados/[slug].astro` | Inmobiliarias con `projectCount > 0`; `getDeveloperProjects`. Hoy no genera ninguna página | Filtros con botón Buscar y contador |
| `/mis-inmuebles` | `pages/mis-inmuebles.astro` | Ninguno | Pinta los guardados, resumen y total; agrega `?agregar={id}`; "Conversemos ahora" abre WhatsApp y registra el lead `cart`; "Programar una sesión" (`ScheduleDialog`) |
| `/propietarios` | `pages/propietarios.astro` | `getDevelopers` (franja de aliados, hoy vacía) | Formulario con intención vender, alquilar o Airbnb |
| `/libro-de-reclamaciones` | `pages/libro-de-reclamaciones.astro` | Datos de la empresa | Formulario de reclamo y constancia. Hoy el panel no tiene la ruta: muestra error y ofrece WhatsApp (ver [03 · API](03-api.md)) |
| `/privacidad`, `/terminos` | `pages/*.astro` con `LegalLayout` | Datos de la empresa | — |
| `/estadias`, `/nosotros` | `PlaceholderLayout` | — | — |
| `/404` | `pages/404.astro` | — | — |
| `/data/properties.json` | `pages/data/properties.json.ts` | `getProperties` + `getImage` | — (lo consumen los scripts) |
| `/mis-depas`, `/capital/depas` | `pages/mis-depas.astro`, `pages/capital/depas.astro` (`RedirectPage`) | — | Redirigen a la dirección nueva conservando `?filtros` y `?agregar=` |
| `/carrito`, `/capital/empecemos` | redirecciones en `astro.config.mjs` | — | Redirigen a `/mis-inmuebles` |

Páginas sin indexar (`<meta name="robots" content="noindex">` y fuera del sitemap):
`/mis-inmuebles`, `/404` y las páginas de `RedirectPage`. `robots.txt` además bloquea `/carrito`,
`/mis-inmuebles`, `/mis-depas`, `/capital/empecemos` y `/data/`.

### Detalle de la portada de Capital

```mermaid
flowchart TB
    A["Hero<br/>título · subtítulo · Ver todos los proyectos → /capital/inmuebles"]
    B["Cómo funciona<br/>Step × 4"]
    C["Buscador + chips<br/>SearchFilters"]
    D["Grilla de inmuebles de propietarios<br/>PropertyCard × N · al final, tarjeta Ver todos los proyectos"]
    A --> B --> C --> D
```

## 4. Layouts

| Layout | Usa | Aporta |
|---|---|---|
| `BaseLayout` | Todas las páginas | `<head>` (título, descripción, canonical, Open Graph, `noindex` opcional), fuentes, skip-link, Header, Footer, diálogo "Guarda tus inmuebles", banner de cookies, monitoreo |
| `LegalLayout` | Privacidad, Términos | Ancho de lectura y fecha de actualización |
| `PlaceholderLayout` | Estadías, Nosotros | Título + "Página en construcción" |

## 5. Componentes

| Componente | Props | Qué hace |
|---|---|---|
| `Header` | — | Logo, menú (Inicio, Compra → `/capital`, Vende → `/propietarios`; Compra queda marcado en `/capital/*` y `/mis-inmuebles`), selector ES · EN, saludo "Hola, {nombre}", acceso a Mis inmuebles con contador, WhatsApp, menú móvil (`<dialog>`) y botón flotante de WhatsApp. Sin botón de ingreso: el sitio no tiene cuentas |
| `Footer` | — | Banda de WhatsApp, links legales, RUC y "Preferencias de cookies" |
| `Logo` | `inverse?` | Marca de Depahost Capital (variante clara para fondos oscuros) |
| `Button` | `href`, `variant?`, `size?`, `block?` | Link con estilo de botón. Si apunta a `wa.me`, siempre sale verde y abre en otra pestaña |
| `Icon` | `name`, `size?`, `strokeWidth?` | Set único de íconos de línea (trazos en `lib/icons.ts`) |
| `PropertyCard` | `property`, `priority?` | Tarjeta de inmueble: foto, etiqueta de origen, badge, valor, rentabilidad, datos (`FactRow`), Me interesa |
| `ProjectCard` | `property`, `priority?` | Tarjeta de proyecto de inmobiliaria: "Precio desde", rentabilidad, descripción |
| `FactRow` | `facts`, `label` | Fila de datos con ícono (dormitorios, área, antigüedad, rentabilidad) en la tarjeta y el detalle |
| `PropertyGallery` | `images`, `videos?`, `title` | Galería del detalle: miniaturas, deslizar en móvil, vista a pantalla completa; videos después de las fotos |
| `VideoPlayer` | `url`, `title`, `poster?` | Video de la galería: archivo nativo o portada de YouTube/Vimeo que carga el reproductor al tocarla |
| `MiniCard` | `property?` | Tarjeta chica; sin `property` es plantilla del navegador |
| `PropertyGrid` | `label?`, `id?` | Grilla de tarjetas: carrusel en móvil, 2 columnas en tablet, 3 en escritorio |
| `PropertyImage` | `image`, `widths`, `sizes`, `priority?` | Foto local o remota, en AVIF/WebP con varios tamaños |
| `SaveButton` | `id`, `name`, `variant?` | Botón "Me interesa" con corazón; alterna guardado y quitado |
| `SearchFilters` | `filters`, `placeholder?`, `withButton?`, `count?` | Buscador, chips, "Limpiar filtros" y contador |
| `ForYouRow` | `title?`, `seeAllHref?` | Fila "Para ti, según lo que has visto". Hoy ninguna página la usa |
| `AlliesStrip` | `developers`, `title?`, `id?` | Inmobiliarias como marcas tipográficas. Sin aliados no muestra nada |
| `SavedDepa` | — | Plantilla `<template>` de un inmueble en Mis inmuebles |
| `SaveListDialog` | — | Diálogo "Guarda tus inmuebles" (lead `saved-list`, en todas las páginas) |
| `ScheduleDialog` | — | "Programar una sesión" de Mis inmuebles: contacto, día, horario y modalidad (lead `cart`) |
| `RedirectPage` | `to` | Página que redirige a una dirección nueva conservando `?query` y `#ancla` |
| `ConsentBanner` | — | Aviso de cookies; carga Clarity solo si se acepta |
| `Turnstile` | `theme?` | Widget anti-bots; no aparece sin `PUBLIC_TURNSTILE_SITE_KEY` |
| `Step` | `number`, `title`, `text?` | Paso del "Cómo funciona" |
| `OwnerDropdown` | — | Menú "Soy propietario" de la home |
| `LangSwitch` | — | Selector ES · EN (EN deshabilitado: no hay versión en inglés) |
| `HouseIcon`, `CartIcon`, `WhatsAppIcon` | `size?` | Íconos sueltos usados antes del set `Icon` |

## 6. Librerías (`src/lib`)

Se usan en el build y en el navegador. No tocan el DOM, salvo `getSavedStore`,
`getHistoryStore` y `getProfileStore`, que necesitan `window`.

| Módulo | Funciones principales | Para qué |
|---|---|---|
| `properties.ts` | `getProperties`, `getOwnerProperties`, `getPropertyBySlug`, `getSimilarProperties`, `getDevelopers`, `getDeveloperProjects`, `getFastFilters`, `getFinancingAssumptions` | Única puerta a los datos en el build |
| `filters.ts` | `buildSearchText`, `toFilterable`, `matchesFilters`, `parseFilters`, `buildFastFilters` | Búsqueda y chips de la portada y de aliados (funciones puras) |
| `catalog-search.ts` | `matchesQuery`, `sortDepas`, `queryFromParams`, `queryToParams`, `paginate`, `pageNumbers`, `priceRanges` | Búsqueda con facetas de Todos los inmuebles |
| `geo.ts` | `distanceKm`, `depaPosition`, `districtCenter`, `formatDistance` | "Cerca de": ubicación exacta o centro del distrito |
| `facts.ts` | `propertyFacts` | Datos del inmueble para `FactRow` |
| `media.ts` | `parseVideo` | Reconoce YouTube, Vimeo o archivo de video |
| `icons.ts` | `ICONS` | Trazos del set de íconos |
| `recommend.ts` | `similarity`, `similarTo`, `recommend` | Similares y "Para ti" |
| `format.ts` | `formatMoney`, `formatPEN`, `formatYield`, `formatYears`, `formatFacts`, `formatDate`, `normalizeText`, `slugify` | Textos consistentes en todo el sitio |
| `saved-store.ts` | `createIdListStore`, `getSavedStore`, `getHistoryStore`, `browserStorage` | Listas de IDs en `localStorage` con eventos (máx. 20 guardados, 12 en historial) |
| `profile.ts` | `firstNameOf`, `createProfileStore`, `getProfileStore` | Primer nombre para el saludo, solo en `localStorage` |
| `api/client.ts` | `api`, `apiConfigured`, tipos `LeadCreate`, `ComplaintCreate`, `ComplaintReceipt`, `ApiError` | Cliente HTTP tipado (sin `credentials`: no hay sesión) |
| `api/loaders.ts` | `hybridLoader`, `fetchJson` | Leer el API o el JSON local en el build |
| `api/schema.d.ts` | (generado con `pnpm api:types`) | Tipos del contrato OpenAPI. No se edita a mano |

## 7. Scripts del navegador (`src/scripts`)

| Script | Lo carga | Qué hace |
|---|---|---|
| `saved-buttons.ts` | `SaveButton` | Escucha clics en `[data-add-property]` (delegación) y alterna Mis inmuebles; actualiza texto y `aria-pressed` |
| `property-filters.ts` | `SearchFilters` | Filtra tarjetas dentro de cada `[data-filter-root]`; contador y "Limpiar filtros" |
| `catalog.ts` | Mis inmuebles, `SaveListDialog`, `ScheduleDialog` | Descarga `/data/properties.json` una sola vez por página |
| `depas-map.ts` | Todos los inmuebles | Mapa Leaflet con pines de precio; se importa solo al elegir "Mapa" |
| `video.ts` | `VideoPlayer` | Inserta YouTube/Vimeo al tocar la portada y detiene los videos al cambiar de foto |
| `forms.ts` | Todos los formularios | Arma el JSON, valida, envía, muestra errores por campo y ofrece WhatsApp |
| `consent.ts` | `ConsentBanner` | Guarda la elección y carga Clarity |
| `monitoring.ts` | `BaseLayout` | Inicia Sentry solo si hay DSN (descarga diferida) |

Los scripts del Header, Mis inmuebles, el detalle y los diálogos están dentro de su `.astro`.
Astro los empaqueta y los carga una sola vez aunque el componente aparezca varias veces.

## 8. Datos de contenido (Content Layer)

`src/content.config.ts` define tres colecciones. Solo `properties` lee el API:

| Colección | Loader | Con `API_URL` | Sin `API_URL` |
|---|---|---|---|
| `properties` | `hybridLoader` | `GET {API_URL}/v1/properties` paginado de a 100 (el panel) | `src/content/properties.json`: `[]`, el sitio queda sin inmuebles |
| `developers` | `file` | — | `src/content/developers.json`: `[]`, no hay inmobiliarias aliadas |
| `financing` | `file` | — | `src/content/financing.json`: supuestos en `null`, no se muestra cuota estimada |

El esquema Zod de `properties` **refleja la respuesta del API**. Si el API cambia de forma, el
build falla aquí y no en una página. Si el API no responde, el build también falla. Las fotos
llegan como URLs firmadas de Supabase Storage (válidas 6 horas): Astro las descarga y optimiza
en el build, por eso `PUBLIC_MEDIA_HOST` debe ser el dominio de Supabase del panel. El esquema
también acepta rutas locales (`../assets/…`), que usa el catálogo de pruebas.

Las pruebas e2e cambian la carpeta con `CATALOG_DIR=tests/e2e/catalogo`: 36 inmuebles de
ejemplo (12 de propietarios y 24 proyectos de 5 aliadas), con sus fotos en
`tests/e2e/catalogo/fotos`. Ese catálogo es **solo para pruebas**: nunca se publica.

## 9. Variables de entorno

Se declaran en `astro.config.mjs` (`env.schema`) y se completan en `.env` (desarrollo),
`.env.preprod` (preproducción, con `--mode preprod`) o en Cloudflare → Worker → Settings →
Build → Variables and secrets (producción). Los valores de cada entorno están en `.env.example`,
`.env.preprod.example` y `.env.production.example`.

| Variable | Contexto | Uso |
|---|---|---|
| `PUBLIC_WHATSAPP_NUMBER` | Navegador | Número de todos los links de WhatsApp. Por defecto `51981352247` |
| `PUBLIC_API_URL` | Navegador | Panel al que van los formularios (`https://<dominio del panel>/api`). Vacío = los formularios ofrecen WhatsApp |
| `API_URL` | Solo build | Panel del que se leen los inmuebles. Vacío = `src/content/properties.json` (vacío) |
| `PUBLIC_TURNSTILE_SITE_KEY` | Navegador | Widget anti-bots |
| `PUBLIC_CLARITY_ID` | Navegador | Analítica, solo con consentimiento |
| `PUBLIC_SENTRY_DSN` | Navegador | Errores del navegador |
| `PUBLIC_MEDIA_HOST` | Build | Dominio de Supabase del panel (`<proyecto>.supabase.co`), permitido para optimizar fotos |
| `PUBLIC_MAP_TILE_URL`, `PUBLIC_MAP_ATTRIBUTION` | Navegador | Mosaicos del mapa. Vacío = OpenStreetMap |
| `CATALOG_DIR` | Solo build (pruebas e2e) | Carpeta del catálogo de ejemplo |

En el build de Cloudflare (`WORKERS_CI=1`), `astro.config.mjs` hace fallar el build si faltan
`API_URL` o `PUBLIC_MEDIA_HOST`. Todas las `PUBLIC_*` terminan en el JavaScript público. Nunca
deben contener secretos.

## 10. Sistema de diseño

### Tokens (`src/styles/tokens.css`)

| Grupo | Ejemplos |
|---|---|
| Color de marca | `--color-navy-800` `#012147` (primario), `--color-navy-900` (footer), `--color-navy-50/100` (fondos suaves) |
| WhatsApp | `--color-wa-700` `#094835` (botones), `--color-wa-500` (solo el ícono) |
| Texto | `--color-text-strong`, `--color-text`, `--color-text-muted` |
| Estados | `--color-success` (rentabilidad), `--color-error`, `--color-focus` |
| Tipografía | `--font-sans` (Poppins), `--font-display` (Poppins en negrita para títulos editoriales), escala fluida `--fs-display` a `--fs-xs` |
| Espacio | Base de 4 px: `--space-1` (4) a `--space-24` (96) |
| Forma | Radios `--radius-sm/md/lg/pill`, sombras `--shadow-sm` a `--shadow-dropdown` |
| Capas | `--z-header`, `--z-dropdown`, `--z-fab`, `--z-toast` |

### Clases globales (`src/styles/global.css`)

| Clase | Uso |
|---|---|
| `.container`, `.section` | Ancho máximo y aire vertical |
| `.btn` + `--primary`, `--secondary`, `--whatsapp`, `--sm`, `--block` | Botones |
| `.display` | Títulos editoriales en Poppins negrita (Capital, Propietarios y sus páginas) |
| `.eyebrow` | Etiqueta en mayúsculas: "DE PROPIETARIO", "INMOBILIARIA ALIADA" |
| `.lead`, `.disclaimer` | Subtítulos y notas legales |
| `.form`, `.field`, `.check`, `.field-error`, `.form-status`, `.hp` | Formularios, errores, resultado y honeypot |
| `.sr-only`, `.skip-link` | Accesibilidad |

**Reglas de diseño que conviene mantener:** azul marino como color principal; verde solo para
WhatsApp; `.display` solo en títulos; íconos de línea del componente `Icon`; sin degradados ni
íconos con fondos de color pastel.

## 11. Accesibilidad, SEO y rendimiento

- **Teclado:** skip-link, foco visible en todo, menú móvil y diálogos con `<dialog>`, que atrapa
  el foco y cierra con Esc.
- **Lectores de pantalla:** títulos ocultos donde el diseño no los muestra, `aria-pressed` en
  "Me interesa", `aria-live` en resultados y formularios, etiquetas en todos los campos.
- **Áreas táctiles:** mínimo 44 px (`--control-h-sm`).
- **Imágenes:** AVIF y WebP en varios tamaños; las 3 primeras tarjetas cargan con prioridad.
- **Fuentes:** autoalojadas, Poppins 400 y 700 precargadas, con respaldo ajustado para no mover el texto.
- **SEO:** canonical, Open Graph, sitemap, `robots.txt` y datos estructurados `Product` en el detalle.
- **Movimiento reducido:** se respetan las preferencias del sistema en animaciones y desplazamiento.
