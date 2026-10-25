# 07 · Decisiones y pendientes

## Decisiones de arquitectura

Cada decisión indica qué se eligió, qué se descartó y qué consecuencia tiene. Antes de
cambiar una, conviene releer el porqué.

| # | Decisión | Alternativa descartada | Por qué | Consecuencia |
|---|---|---|---|---|
| 1 | Sitio 100 % estático con Astro | Astro con servidor (SSR, Actions) | Rápido, barato, resistente a caídas del API, bueno para SEO | Los cambios de datos requieren rebuild (deploy hook) |
| 2 | Backend en un repo y servicio aparte | Lógica de servidor dentro de Astro | Decisión del equipo: backend desacoplado, migrable a Go | Dos despliegues y un contrato que mantener |
| 3 | Fastify + TypeScript | Go (chi, Echo) | Mismo lenguaje que el frontend; equipo chico | Migrar a Go es posible: el contrato y las capas lo permiten |
| 4 | Drizzle | Prisma | SQL explícito, sin paso de generación, consultas portables a `sqlc` | Las consultas se escriben más cerca del SQL |
| 5 | OpenAPI generado desde el código, con chequeo en CI | `openapi.yaml` escrito a mano | Una sola fuente de verdad, sin duplicar esquemas | El API manda; el frontend sigue con `api:sync` |
| 6 | PostgreSQL en todos los entornos; PGlite solo en pruebas | Docker obligatorio para desarrollar | Pruebas sin instalar nada y sin red; desarrollo contra un Postgres real | PGlite no es idéntico a Postgres: la CI corre las migraciones en Postgres real |
| 7 | Mis depas, historial y perfil en `localStorage` | Cuentas de usuario desde el inicio | Funciona sin login y sin servidor | No se sincroniza entre dispositivos |
| 8 | Catálogo estático `/data/properties.json` para los scripts | Pedir al API los depas guardados en cada visita | Fotos ya optimizadas y sin depender del API en vivo | Crece con el catálogo; con miles de depas convendría paginar o pedir al API |
| 9 | Validación nativa del navegador + errores del API | Zod en el navegador | Menos JavaScript en cada página | Las reglas finas viven solo en el API |
| 10 | Turnstile + honeypot + límite por IP | Captcha de imágenes | Sin fricción para la persona | Requiere Cloudflare |
| 11 | Fotos en R2 con URL prefirmada | Subir archivos a través del API | El API no maneja archivos grandes | El panel sube directo a R2 |
| 12 | Leads "dispara y olvida" hacia correo y CRM | Fallar si falla el correo | Ningún lead se pierde por un proveedor caído | Los fallos de aviso solo quedan en el log |
| 13 | WhatsApp como salida final de cada flujo | Chat propio o formulario largo | Así trabaja el equipo hoy | El API registra el interés antes de abrir WhatsApp |
| 14 | Plazo de reclamos sin feriados | Calendario de feriados | Lo conservador es responder antes | Algunos plazos quedan unos días antes que el legal |
| 15 | Serif solo en títulos de Capital y Propietarios | Serif en todo el sitio | Mantiene la home tal como en los mocks | Se cambia en una variable: `--font-display` |
| 16 | Cuentas propias en el API (scrypt + cookie de sesión) | Better Auth | Pocas piezas, todo explícito y probado, sin depender de la versión de una librería | Recuperar contraseña, verificación de correo y 2FA se implementan a mano |
| 17 | Panel como app Vue aparte (`app.depahostperu.com`) | Páginas del panel dentro de Astro | Interacción de aplicación, sin tocar el sitio estático | Un tercer repo y un tercer despliegue |
| 18 | Identidad visual copiada del sitio con `sync:brand` | Paquete compartido de diseño | Sin monorepo ni publicación de paquetes | Hay que sincronizar al cambiar el diseño del sitio |
| 19 | Rol único por cuenta (comprador, propietario o admin) | Varios roles a la vez | Menú y permisos simples | Quien compra y vende cambia de rol en su perfil |
| 20 | Supabase en producción, usado solo como PostgreSQL | Supabase como backend (Auth, Data API, Storage) | El backend sigue desacoplado y migrable a Go; Supabase solo aporta la base gestionada | Data API desactivada, RLS sin políticas en todas las tablas y SSL verificado con el certificado de Supabase |
| 21 | Postgres local propio del proyecto (`pnpm db:up`) | Docker Compose, o el PostgreSQL del sistema | Sin `sudo` ni Docker; cada repo trae su base y se borra con una carpeta | Hay que encenderlo tras reiniciar la máquina. Usa la versión de PostgreSQL instalada (hoy 18); la CI prueba las migraciones en la 17 |
| 22 | Preproducción en la máquina local por ahora | Preproducción en la nube desde ya | Todavía no hay hosting; prueba los builds de producción sin costo | Solo la ve quien la levanta. Pasarla a la nube pide otro proyecto de Supabase y un nombre de cookie propio |

## Problemas conocidos

| Problema | Dónde | Impacto | Arreglo sugerido |
|---|---|---|---|
| "Parecidos a los que guardaste" queda pegado al footer | `ForYouRow.astro`: `padding-block: var(--space-8) 0` | Visual, en `/mis-depas` | Agregar espacio inferior a la sección |
| El saludo "Hola, Ana" no aparece en móvil | `Header.astro`: `.greeting` desde 640 px | Visual | Mostrarlo en el menú móvil (hoy el menú solo ofrece "Ingresar a mi cuenta") |
| Sin verificación de correo | `modules/accounts` | Alguien puede registrarse con un correo ajeno | Enviar enlace de verificación antes de vincular datos sensibles |
| Las cuentas no se pueden borrar desde el panel | `modules/accounts` | La Ley 29733 da derecho de cancelación | Agregar "Eliminar mi cuenta" o atenderlo por correo mientras tanto |
| "Para ti" aparece un instante después de cargar | `ForYouRow.astro` | Mueve un poco lo de abajo en Capital | Reservar altura o mostrarla después de los aliados |
| Los depas vendidos no tienen página | `getProperties()` excluye `sold` | Un link viejo a un depa vendido da 404 | Generar su página con la etiqueta "Vendido" |
| El plazo de reclamos no descuenta feriados | `lib/business-days.ts` | Plazo más corto que el legal | Agregar el calendario de feriados nacionales |
| En el resumen de administración, "Reclamos por responder" queda unos píxeles más arriba que las otras tarjetas de su fila | Panel, vista de resumen | Visual | Alinear las tarjetas de esa fila |
| Los depas reservados se marcan como agotados (`SoldOut`) en los datos estructurados | Ficha del depa (`capital/[slug].astro`) | Google puede mostrarlos como agotados aunque sigan a la venta | Usar otro estado para "reservado" o no marcar disponibilidad |
| "Editar mi depa" con una solicitud ajena o inexistente se queda en "Cargando…" | Panel, `RequestFormView.vue` | La persona no recibe ningún mensaje | Mostrar el mismo aviso que el detalle |
| "Sin fotos. Puedes agregarlas al editar." aparece cuando la solicitud ya no se puede editar | Panel, detalle de la solicitud | Invita a algo que no se puede hacer ("En revisión", "Publicada") | Mostrar ese texto solo si la solicitud es editable |
| El contador "Consultas" del propietario suma cada toque repetido en "Escribir por WhatsApp" | API, indicadores del propietario | Infla el interés que ve el propietario | Contar personas o consultas distintas |
| La inversión total con solo depas en dólares se escribe distinto en el sitio ("S/ 0 + US$ …") y en el panel ("US$ …") | `/mis-depas` del sitio | Inconsistencia visual | Omitir los soles cuando son cero |
| `/docs` (Swagger) también responde en producción | `app.ts` | Muestra la lista de rutas; el contrato ya es público | Decidir si se oculta en producción |

## Deuda técnica menor

| Qué | Dónde |
|---|---|
| `drizzle-zod` está instalado pero no se usa | `depahost-api/package.json` |
| `getPropertyBySlug` y `renderSaveButtons` no se usan | `src/lib/properties.ts`, `src/scripts/saved-buttons.ts` |
| El evento `depahost:viewed-depas-updated` no tiene suscriptores | `src/lib/saved-store.ts` |
| El origen de lead `contact` no lo usa ningún formulario | `depahost-api/src/modules/leads/schema.ts` |
| `HouseIcon`, `CartIcon` y `WhatsAppIcon` conviven con el set `Icon` | `src/components/` |
| TypeScript fijado en la versión 6 | Lo exigen `@astrojs/check` y `openapi-typescript` |

## Pendientes

### Contenido y legal (antes de publicar)

- [ ] Número real de WhatsApp en `PUBLIC_WHATSAPP_NUMBER`.
- [ ] Razón social, RUC y dirección fiscal en `src/data/empresa.ts` y `COMPANY_*` del API.
- [ ] Revisión legal de la política de privacidad y los términos (hoy son borradores).
- [ ] Reemplazar los depas y proyectos de ejemplo, y subir sus fotos reales a R2.
- [ ] Inmobiliarias aliadas reales, con permiso de uso de nombre y logo.
- [ ] Dormitorios, baños y m² de cada depa.
- [ ] Supuestos reales de financiamiento (tasa, inicial, plazo y fecha).
- [ ] Contenido de Estadías y Nosotros.

### Producto (siguientes etapas)

- [x] **Cuentas de usuario** con Mis depas sincronizado (ver capítulo 08).
- [x] **Panel** para comprador, propietario y administración (ver capítulo 08).
- [ ] **Verificación de correo** y **segundo factor** para administradores.
- [ ] **Eliminar mi cuenta** desde el panel (derecho de cancelación).
- [ ] **"Para ti, según tu perfil"**: recomendaciones calculadas en el API con el presupuesto e
  intereses de la cuenta.
- [ ] **Versión en inglés** del sitio (hoy solo el formulario de Capital está en inglés).
- [ ] **Reservas de estadías** integrando un PMS (Hostaway, Guesty o Lodgify).
- [ ] **Logos de inmobiliarias** en `logoUrl` y en la franja de aliados.

### Infraestructura

- [x] Postgres local para desarrollo y preproducción (`pnpm db:up`).
- [x] Configuración por entorno (`.env`, `.env.preprod`, `.env.production.example`) en los tres repos.
- [ ] Crear el proyecto de Supabase en São Paulo, desactivar su Data API y guardar
  `certs/supabase-ca.crt` en el API.
- [ ] Contratar el hosting del sitio y del API (el API cerca de São Paulo).
- [ ] Crear las cuentas de Cloudflare (Turnstile y R2) y Resend.
- [ ] Subir los tres repos a GitHub para que corra la CI.
- [ ] Publicar el panel en Vercel con el dominio `app.depahostperu.com`.
- [ ] Crear el primer administrador con `pnpm user:create`.
- [ ] Configurar el deploy hook y `NOTIFY_EMAIL`.
- [ ] Si preproducción pasa a la nube: nombre de cookie configurable y un segundo proyecto de Supabase.
