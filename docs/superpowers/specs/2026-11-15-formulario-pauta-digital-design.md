# Formulario de pauta digital · diseño corto

Fecha: 2026-11-15 · Toca dos repos: esta landing (`DHC_landing`) y el panel (`Pannel`).

## Para qué

Una sola página fija, `/registro`, que sirve de destino a **todas** las pautas digitales (Meta, Google, etc.).
Recoge los datos de la persona y los envía al panel como los demás formularios. Cada campaña se distingue
por los `utm_*` del link del anuncio, que la landing ya guarda y el panel ya anota en el lead.

## Objetivos

- Campos: nombre, celular, correo, si quiere **comprar** o **vender**, consentimiento de privacidad y
  consentimiento de publicidad.
- En el panel el lead entra como **interesado** (comprar) o **propietario** (vender), con el canal
  `Web · Pauta digital · Quiere comprar|vender · <utm_source>` y la UTM completa en la nota.
- El consentimiento de publicidad queda guardado en `leads.consentimiento_marketing` (hoy la ruta web
  siempre guarda `false`).
- Al enviar, la persona va a `/registro/gracias`. Esa URL permite medir conversiones en Meta y Google Ads
  por URL, sin instalar píxeles.

## Fuera de alcance

- Una página distinta por campaña (opción B). El formulario queda como componente, así que hacerla
  después es barato.
- Píxeles de Meta o Google Ads.
- La opción "comprar y vender a la vez".

## Lo que no puede pasar

- Que se pierda un lead sin aviso: si la API falla o no está configurada, se ofrece WhatsApp (como hoy).
- Que el consentimiento de publicidad sea obligatorio (Ley 29733): es opcional y viene desmarcado.

## Enfoques considerados

- **A. Una sola URL y campañas por UTM** (el elegido): lo más simple, no hay que tocar código
  por campaña.
- **B. Una página por campaña** con su propio texto e imagen: más trabajo por campaña. Queda posible
  gracias al componente.

Para el origen en el panel se eligió agregar orígenes nuevos (`ad-buy`, `ad-sell`) en vez de reutilizar
`contact` y `owner-sell`, para que en el panel se lea "Pauta digital" y no "Contacto".

## Cómo se construye

### Landing

- `src/components/LeadCaptureForm.astro`: el formulario y su script, con `enhanceForm` de
  `src/scripts/forms.ts` (mismas convenciones: errores por campo, honeypot `website`, Turnstile).
- Campos y reglas:
  - Nombre: obligatorio, 2–120 caracteres.
  - Celular: obligatorio, el mismo patrón de los demás formularios.
  - Correo: obligatorio (*decisión de Claude*: lo pediste como dato a recabar; puede quedar opcional).
  - Comprar / Vender: radio, obligatorio.
  - "Acepto la política de privacidad": obligatorio, con link a `/privacidad`.
  - "Acepto recibir novedades y ofertas de Depa Host por WhatsApp y correo": opcional, desmarcado.
- Envío: `{ source: 'ad-buy' | 'ad-sell', name, phone, email, consent, marketingConsent, utm, locale: 'es',
turnstileToken, website }`.
- `src/pages/registro.astro`: usa `BaseLayout` con header y footer (*decisión de Claude*: se ve de la
  marca; una versión sin menú es un cambio chico). `noindex` y fuera del sitemap.
- `src/pages/registro/gracias.astro`: confirmación ("Te escribimos por WhatsApp"), `noindex`.
- Contrato `openapi/depahost-api.json`: agrega `ad-buy` y `ad-sell` al enum de `source` y el campo
  `marketingConsent` (boolean). Luego `pnpm api:types`. (`pnpm api:sync` apunta al repo viejo
  `depahost-api`: el contrato se edita a mano aquí.)
- Pruebas: e2e en `tests/e2e/forms.spec.ts` (envía el payload correcto para comprar y vender y llega a
  `/gracias`).

### Panel

- `app/api/v1/leads/route.ts`: agrega a `ORIGENES` `'ad-buy': 'Pauta digital · Quiere comprar'` y
  `'ad-sell': 'Pauta digital · Quiere vender'`, y envía `p_consentimiento_marketing: b.marketingConsent === true`.
- Migración nueva en `supabase/migrations/`: recrea `registrar_lead_web` con el parámetro
  `p_consentimiento_marketing boolean default false`, acepta los orígenes nuevos, crea un propietario
  cuando el origen es `owner-sell` o `ad-sell`, y vuelve a dar permiso solo a `service_role`.
- Prueba en `scripts/probar-sql.mjs`: `ad-sell` crea un propietario, `ad-buy` crea un interesado y se
  guarda el consentimiento de publicidad.

## Restricciones

- **Orden de despliegue: primero el panel y después la landing.** Si no, el panel rechaza `ad-buy` con
  "Origen no válido".
- CORS: `WEB_ORIGINS` del panel ya incluye el dominio de la landing.

## Queda para quien lo construya

- Si una persona que ya tiene un lead vigente del mismo tipo vuelve a enviar el formulario, cómo
  actualiza `registrar_lead_interno` sus consentimientos. Revisarlo y, si no los actualiza, anotarlo
  como pendiente sin cambiar esa función.
- Los textos finales del encabezado de la página.
