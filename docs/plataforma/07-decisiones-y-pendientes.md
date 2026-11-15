# 07 · Decisiones y pendientes

Estado al 13 de noviembre de 2026. La plataforma son dos repos: este sitio (`DHC_landing`) y el panel interno
`DH_panel` (Next.js + Supabase), que es su backend. Las decisiones del backend viven en la documentación de
`DH_panel`.

## Decisiones vigentes

Cada decisión indica qué se eligió, qué se descartó y qué consecuencia tiene. Antes de cambiar una, conviene
releer el porqué.

| # | Decisión | Alternativa descartada | Por qué | Consecuencia |
|---|---|---|---|---|
| 1 | Sitio 100 % estático con Astro | Astro con servidor (SSR, Actions) | Rápido, barato, resistente a caídas del API, bueno para SEO | Los cambios de datos requieren rebuild (deploy hook) |
| 2 | Backend en un repo y servicio aparte: el panel `DH_panel` | Lógica de servidor dentro de Astro | El equipo ya trabaja en el panel; el sitio queda simple | Dos despliegues y un contrato que mantener |
| 3 | El contrato `openapi/depahost-api.json` vive en el sitio y el panel lo implementa a mano | Generarlo desde el código del panel | El panel solo implementa dos rutas del contrato | Nada comprueba automáticamente que el panel lo cumpla (ver problemas) |
| 4 | "Mis inmuebles", historial y perfil solo en `localStorage`, sin cuentas de visitantes | Cuentas de usuario | Funciona sin login y sin servidor; el panel es interno | No se sincroniza entre dispositivos |
| 5 | Catálogo estático `/data/properties.json` para los scripts | Pedir al API los inmuebles guardados en cada visita | Fotos ya optimizadas y sin depender del API en vivo | Crece con el catálogo; con miles de inmuebles convendría paginar |
| 6 | Validación nativa del navegador + errores del API | Zod en el navegador | Menos JavaScript en cada página | Las reglas finas viven solo en el panel |
| 7 | Turnstile + honeypot contra el spam | Captcha de imágenes | Sin fricción para la persona | Requiere Cloudflare; hoy no hay límite por IP |
| 8 | Fotos en Supabase Storage, optimizadas en el build | Servir las fotos desde Supabase en cada visita | Las URLs firmadas caducan a las 6 horas; Astro las copia al sitio | Sin `PUBLIC_MEDIA_HOST` no se optimizan (por eso el build de Cloudflare falla sin ella) |
| 9 | El lead se registra en el panel (CRM propio) | Correo y CRM externo | El equipo sigue cada lead desde el panel | Si el panel no responde, el formulario ofrece WhatsApp |
| 10 | WhatsApp como salida final de cada flujo | Chat propio o formulario largo | Así trabaja el equipo hoy | El panel registra el interés antes de abrir WhatsApp |
| 11 | Serif solo en títulos de Capital y Propietarios | Serif en todo el sitio | Mantiene la home tal como en los mocks | Se cambia en una variable: `--font-display` |
| 12 | Sitio en Cloudflare Workers con archivos estáticos; Workers Builds publica la rama `deploy/sitio` | Cloudflare Pages | `deploy/sitio` solo avanza cuando la CI pasó | El nombre del Worker (`depahost-monorepo`) debe coincidir con `wrangler.jsonc` |
| 13 | El build de Cloudflare falla sin `API_URL` o `PUBLIC_MEDIA_HOST` | Publicar con advertencias | Evita publicar un sitio sin inmuebles o con fotos que caducan | Hay que configurarlas antes del primer despliegue |
| 14 | El catálogo de ejemplo existe solo para las pruebas e2e (`tests/e2e/catalogo`, `CATALOG_DIR`) | Datos de ejemplo en `src/content` | Nada de ejemplo llega a producción | Sin `API_URL`, el sitio local no tiene inmuebles |
| 15 | Preproducción en la máquina local (`pnpm preprod`) | Preproducción en la nube | Prueba builds de producción sin costo | Solo la ve quien la levanta |

### Decisiones retiradas

Las tomó la arquitectura anterior (API `depahost-api` en Fastify y panel de cuentas en Vue), que reemplazó
`DH_panel`. Siguen en el historial de git: Fastify, Drizzle, PostgreSQL + PGlite propios, OpenAPI generado desde el
API, fotos en R2, correo con Resend, cuentas de comprador y propietario con sesión propia, rol único por cuenta,
`sync:brand` y Supabase usado solo como base de datos.

## Problemas conocidos

| Problema | Dónde | Impacto | Arreglo sugerido |
|---|---|---|---|
| **El Libro de Reclamaciones no registra nada**: el panel no tiene `POST /api/v1/complaints` | `DH_panel` (el sitio envía desde `libro-de-reclamaciones.astro`) | Obligación legal (INDECOPI): no hay código ni constancia; el formulario muestra error y ofrece WhatsApp | Implementar la ruta en el panel con código `LR-AAAA-NNNNNN`, plazo de respuesta y constancia por correo (ver [03 · API](03-api.md)) |
| El catálogo del panel se guarda en caché hasta ~15 min (`s-maxage=300, stale-while-revalidate=600`) | `DH_panel/app/api/v1/properties/route.ts` | El rebuild de "Actualizar web" puede leer el catálogo viejo y no mostrar un inmueble recién publicado | Responder con `Cache-Control: no-store` (solo lo lee el build) |
| `POST /api/v1/leads` no tiene límite por IP | `DH_panel/app/api/v1/leads/route.ts` | Los clics anónimos de "Mis inmuebles" (sin celular, sin captcha) se pueden abusar | Límite por IP (por ejemplo, Vercel Firewall) |
| El contrato incluye rutas que el panel no implementa (cuentas, administración, inmobiliarias) | `openapi/depahost-api.json` | `pnpm api:mock` y los tipos sugieren rutas que no existen | Recortar el contrato a lo que el sitio usa cuando se implemente reclamos |
| El saludo "Hola, Ana" no aparece en móvil | `Header.astro`: `.greeting` desde 640 px | Visual | Mostrarlo en el menú móvil |
| Los inmuebles vendidos no tienen página | `getProperties()` excluye `sold`; el panel solo envía publicados | Un link viejo a un inmueble que salió de la web da 404 | Generar su página con la etiqueta "Vendido" cuando el panel los envíe |
| Los inmuebles reservados se marcarían como agotados (`SoldOut`) en los datos estructurados | Ficha del inmueble (`capital/[slug].astro`) | Hoy no pasa: el panel no envía reservados | Usar otro estado para "reservado" si el panel empieza a enviarlos |
| La inversión total con solo inmuebles en dólares se escribe "S/ 0 + US$ …" | `/mis-inmuebles` | Visual; hoy el panel solo envía precios en soles | Omitir los soles cuando son cero |
| Sin `Content-Security-Policy` | `public/_headers` | Menos defensa ante scripts inyectados | Definirla probando Clarity, Sentry, Turnstile, mapas y videos; empezar en modo `Report-Only` |

## Deuda técnica menor

| Qué | Dónde |
|---|---|
| `ForYouRow`, `MiniCard` y `src/lib/recommend.ts` no se usan por ahora ("Para ti" y "similares" están apagados) | `src/components/`, `src/lib/` |
| `getPropertyBySlug` y `renderSaveButtons` no se usan | `src/lib/properties.ts`, `src/scripts/saved-buttons.ts` |
| El evento `depahost:viewed-depas-updated` no tiene suscriptores | `src/lib/saved-store.ts` |
| El origen de lead `contact` no lo usa ningún formulario | Contrato y panel |
| `HouseIcon`, `CartIcon` y `WhatsAppIcon` conviven con el set `Icon` | `src/components/` |
| TypeScript fijado en la versión 6 | Lo exigen `@astrojs/check` y `openapi-typescript` |

## Pendientes

### Antes de publicar (contenido y legal)

- [ ] `POST /api/v1/complaints` en el panel (Libro de Reclamaciones).
- [ ] Confirmar el número de WhatsApp (`PUBLIC_WHATSAPP_NUMBER`; por defecto `51981352247`).
- [ ] Razón social, RUC y dirección fiscal en `src/data/empresa.ts` (hoy el footer dice "RUC [pendiente]").
- [ ] Revisión legal de la política de privacidad y los términos (hoy son borradores).
- [ ] Inmuebles reales en el panel, con fotos, dormitorios, baños y m².
- [ ] Supuestos reales de financiamiento (tasa, inicial, plazo y fecha) en `src/content/financing.json`.
- [ ] Contenido de Estadías y Nosotros.

### Producto (siguientes etapas)

- [ ] Inmobiliarias aliadas reales, con permiso de uso de nombre y logo (`src/content/developers.json`, hoy vacío).
- [ ] **Versión en inglés** del sitio (hoy solo el formulario de Capital está en inglés).
- [ ] **Reservas de estadías** integrando un PMS (Hostaway, Guesty o Lodgify).
- [ ] **Ubicación exacta y videos** de cada inmueble desde el panel (hoy el panel envía `location: null` y `videos: []`).
- [ ] **Mosaicos del mapa** con un proveedor con clave (MapTiler, Mapbox…) cuando suba el tráfico:
  `PUBLIC_MAP_TILE_URL` y `PUBLIC_MAP_ATTRIBUTION`.

### Infraestructura

- [ ] En Cloudflare, variables del Worker según `.env.production.example`.
- [ ] En el panel, `WEB_ORIGINS` (dominio del sitio), `TURNSTILE_SECRET_KEY` y `CLOUDFLARE_DEPLOY_HOOK_URL`.
- [ ] Después del primer despliegue, comprobar con `curl -I` que `*.workers.dev` responde `X-Robots-Tag: noindex`.
- [ ] Correr las pruebas e2e en la CI (hoy se corren a mano con `pnpm test:e2e`).
