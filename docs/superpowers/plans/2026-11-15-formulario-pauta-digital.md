# Formulario de pauta digital · plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Página `/registro` que recoge nombre, celular, correo, comprar/vender y dos consentimientos, y crea el
lead en el panel con el origen "Pauta digital".

**Architecture:** El panel (`C:\SHATECH\Pannel`, Next.js + Supabase) acepta dos orígenes nuevos (`ad-buy`,
`ad-sell`) y el consentimiento de publicidad en `POST /api/v1/leads`. La landing (Astro estático) agrega el
campo al contrato, un componente de formulario que usa `enhanceForm` y dos páginas (`/registro`,
`/registro/gracias`).

**Tech Stack:** Astro 7, TypeScript, openapi-fetch, Vitest, Playwright · Next.js 16, Postgres (Supabase), PGlite para
las pruebas SQL.

**Spec:** `docs/superpowers/specs/2026-11-15-formulario-pauta-digital-design.md`

## Global Constraints

- Orígenes nuevos: `ad-buy` → lead **interesado**, `ad-sell` → lead **propietario**.
- Etiquetas en el panel: `'Pauta digital · Quiere comprar'` y `'Pauta digital · Quiere vender'`.
- Campo nuevo del contrato: `marketingConsent` (boolean, default `false`).
- Consentimiento de privacidad obligatorio; consentimiento de publicidad opcional y desmarcado.
- Correo obligatorio en el formulario.
- `/registro` y `/registro/gracias`: `noindex` y fuera del sitemap.
- Textos en español (Perú). Sin commits hasta que el usuario lo pida; se trabaja en la rama
  `pauta-digital` de cada repo.

## Review Focus

1. El panel aún no está desplegado y responde 400 "Origen no válido": la persona ve el error y el link de
   WhatsApp (lo hace `enhanceForm`; prueba e2e en la tarea 4).
2. Publicidad desmarcada: se envía `marketingConsent: false`, nunca se omite como `true` (prueba unitaria, tarea 3).
3. Sin elegir comprar o vender: el navegador bloquea el envío y no se llama a la API (prueba e2e, tarea 4).
4. Llega con `?utm_source=facebook`: el lead lleva `utm.source = 'facebook'` (prueba e2e, tarea 4).
5. Alguien que ya es lead vuelve a enviar marcando publicidad: el panel suma el consentimiento
   (`registrar_lead_interno` ya hace `or`; prueba SQL, tarea 1).

---

### Task 1: Panel · función SQL con orígenes nuevos y consentimiento de publicidad

**Files:**
- Create: `C:\SHATECH\Pannel\supabase\migrations\20261115000200_pauta_digital.sql`
- Test: `C:\SHATECH\Pannel\scripts\probar-sql-fases.mjs` (nuevo escenario junto a "Sitio web: catálogo…")

**Interfaces:**
- Produces: `registrar_lead_web(p_origen text, p_nombre text, p_telefono text, p_email text, p_inmuebles uuid[], p_nota text, p_consentimiento boolean, p_detalle jsonb, p_consentimiento_marketing boolean default false) returns uuid`

- [ ] **Step 1: Escenario `'Sitio web: pauta digital crea interesado o propietario y guarda la publicidad'`**
  - `registrar_lead_web('ad-buy', 'Ana Pauta', '955111000', 'ana@x.pe', null, null, true, null, true)` → lead
    `tipo = 'interesado'`, `consentimiento_marketing = true`.
  - `registrar_lead_web('ad-sell', 'Raúl Pauta', '955111001', null, null, null, true, null)` (8 argumentos) →
    `tipo = 'propietario'`, `consentimiento_marketing = false`.
  - El mismo `955111001` con `'ad-sell'` y `p_consentimiento_marketing = true` → mismo lead, ahora `true`.
- [ ] **Step 2:** `npm run test:sql` → FALLA con "Origen del sitio no válido: ad-buy".
- [ ] **Step 3: Migración.** `drop function` de la firma de 8 argumentos; `create function` con la firma de
  arriba (mismo cuerpo, acepta `ad-buy`/`ad-sell`, propietario si `p_origen in ('owner-sell', 'ad-sell')`, pasa
  `coalesce(p_consentimiento_marketing, false)` a `registrar_lead_interno`); `revoke` a public/anon/authenticated
  y `grant execute` a `service_role` con la firma nueva.
- [ ] **Step 4:** `npm run test:sql` → todos los escenarios pasan.

### Task 2: Panel · ruta `/api/v1/leads`

**Files:**
- Modify: `C:\SHATECH\Pannel\app\api\v1\leads\route.ts`

**Interfaces:**
- Consumes: la firma de la tarea 1.
- Produces: el cuerpo acepta `source: 'ad-buy' | 'ad-sell'` y `marketingConsent: boolean`.

- [ ] **Step 1:** agregar a `ORIGENES` las dos etiquetas de Global Constraints y pasar
  `p_consentimiento_marketing: b.marketingConsent === true` en el `rpc`.
- [ ] **Step 2:** `npm run typecheck` y `npm run lint` sin errores.

### Task 3: Landing · contrato y armado del envío

**Files:**
- Modify: `openapi/depahost-api.json` (`LeadCreateInput` y `LeadCreate`: enum de `source` + `marketingConsent`)
- Regenerate: `src/lib/api/schema.d.ts` con `pnpm api:types`
- Create: `src/lib/campaign-lead.ts`
- Test: `tests/unit/campaign-lead.test.ts`

**Interfaces:**
- Produces:
  - `type CampaignIntent = 'buy' | 'sell'`
  - `buildCampaignLead(fields: Record<string, unknown>, utm?: Record<string, string>): LeadCreate`. Quita
    `intent`, pone `source`, `locale: 'es'` y `utm`, y conserva `name`, `phone`, `email`, `consent`,
    `marketingConsent`, `website` y `turnstileToken`.
  - `campaignWhatsappMessage(fields: Record<string, unknown>): string`

- [ ] **Step 1: Pruebas**
  - `intent: 'sell'` → `source: 'ad-sell'`; `intent: 'buy'` → `'ad-buy'`; la salida no tiene `intent`.
  - `marketingConsent: false` se conserva como `false`; se agregan `locale: 'es'` y `utm`.
  - Mensaje: `'Hola, soy Ana. Quiero comprar un inmueble.'` / `'Hola, soy Ana. Quiero vender mi inmueble.'`
- [ ] **Step 2:** `pnpm test campaign-lead` → FALLA (no existe el módulo).
- [ ] **Step 3:** editar el contrato, `pnpm api:types` e implementar `src/lib/campaign-lead.ts`.
- [ ] **Step 4:** `pnpm test` y `pnpm check` pasan.

### Task 4: Landing · formulario y páginas

**Files:**
- Create: `src/components/LeadCaptureForm.astro` (formulario y script; prop `heading?: string`)
- Create: `src/pages/registro.astro`, `src/pages/registro/gracias.astro`
- Modify: `astro.config.mjs` (excluir `/registro` y `/registro/gracias` del sitemap)
- Test: `tests/e2e/forms.spec.ts`

**Interfaces:**
- Consumes: `buildCampaignLead`, `campaignWhatsappMessage` (tarea 3); `enhanceForm`, `getUtm` (`src/scripts/forms.ts`).

- [ ] **Step 1: Pruebas e2e**
  - `'Pauta digital: envía el lead de compra con la UTM y lleva a gracias'`: `/registro?utm_source=facebook`,
    llenar, elegir "Comprar", marcar privacidad → payload `{ source: 'ad-buy', consent: true, marketingConsent: false, utm: { source: 'facebook' } }` y URL `/registro/gracias`.
  - `'Pauta digital: vender con publicidad aceptada'` → `{ source: 'ad-sell', marketingConsent: true }`.
  - `'Pauta digital: sin elegir comprar o vender no envía'` → 0 llamadas a la API.
  - `'Pauta digital: si el panel rechaza el origen ofrece WhatsApp'` → 400 `{ message: 'Origen no válido' }` →
    se ve "Origen no válido" y el link "Escribir por WhatsApp".
- [ ] **Step 2:** `pnpm test:e2e forms` → FALLAN (la página no existe).
- [ ] **Step 3:** componente y páginas. Campos: Nombre, Celular, Correo, radios "Comprar"/"Vender" (`name="intent"`),
  checkbox privacidad (`consent`, required) y checkbox publicidad (`marketingConsent`): "Acepto recibir
  novedades y ofertas de Depa Host por WhatsApp y correo". Honeypot `website` y `<Turnstile />`. Al terminar
  bien, `location.assign('/registro/gracias')`.
- [ ] **Step 4:** `pnpm test:e2e forms`, `pnpm lint`, `pnpm check` y `pnpm build` pasan.
