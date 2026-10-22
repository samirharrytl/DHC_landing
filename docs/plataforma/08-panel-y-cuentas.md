# 08 · Panel y cuentas

Desde esta etapa la plataforma tiene **cuentas de usuario** y un **panel** para tres roles. El panel
es una app Vue en su propio repo, `depahost-panel`, servida en `app.depahostperu.com`.

| Rol | Valor en el API | Qué hace en el panel |
|---|---|---|
| Comprador | `buyer` | Mis depas (sincronizado con el sitio), Mis consultas, Perfil |
| Propietario | `seller` | Publicar su depa, seguir la revisión y el interés que genera, más lo del comprador |
| Administrador | `admin` | Resumen, depas, solicitudes de propietarios, leads, reclamos, inmobiliarias, usuarios y configuración |

## 1. Las tres apps y la sesión

```mermaid
flowchart LR
    subgraph Navegador["Navegador"]
        SITIO["Sitio<br/>depahostperu.com"]
        PANEL["Panel<br/>app.depahostperu.com"]
        C1[("Cookie dh_session<br/>httpOnly · SameSite=Lax")]
        C2[("Cookie dh_has_session=1<br/>legible, sin secretos")]
    end
    API["API<br/>api.depahostperu.com"]
    DB[("PostgreSQL<br/>users · sessions")]

    PANEL -- "POST /v1/auth/login" --> API
    API -- "Set-Cookie (dominio .depahostperu.com)" --> C1 & C2
    SITIO -. "lee el indicador" .-> C2
    SITIO -- "GET /v1/auth/me · PUT /v1/me/saved<br/>credentials: include" --> API
    PANEL -- "todas las llamadas<br/>credentials: include" --> API
    API --- DB
```

- **La sesión la crea el panel y la guarda el API** en la cookie `dh_session`. JavaScript no puede
  leerla (`httpOnly`), así que un script malicioso no puede robarla.
- **El dominio de la cookie es `.depahostperu.com`** (`COOKIE_DOMAIN`). Así la reciben el sitio, el
  panel y el API.
- **El sitio no consulta al API en cada visita anónima.** Solo pregunta "¿quién es?" si existe la
  cookie `dh_has_session=1`, que el API crea y borra junto con la sesión.
- **En la base solo se guarda el SHA-256 del token** de sesión. Si alguien lee la base, no puede
  usar las sesiones.

## 2. Estructura del panel

```text
depahost-panel/
├── index.html, vite.config.ts
├── public/_headers         cabeceras de Cloudflare Pages
├── scripts/sync.mjs        sync:brand (identidad del sitio) y sync:api (contrato)
├── src/
│   ├── main.ts, App.vue     arranque; App elige el layout según la ruta
│   ├── api/                 cliente tipado y schema.d.ts generado del contrato
│   ├── brand/               ⚠️ copiado del sitio: icons.ts, format.ts, distritos.ts
│   ├── styles/brand/        ⚠️ copiado del sitio: tokens.css, global.css
│   ├── styles/panel.css     lo propio del panel: tarjetas, tablas, insignias
│   ├── router/              rutas, reglas de acceso (access.ts) y menú por rol (nav.ts)
│   ├── stores/auth.ts       sesión (Pinia)
│   ├── composables/         useForm, useToast, textos y helpers de contacto
│   ├── layouts/             AuthLayout (ingresar) y PanelLayout (menú lateral)
│   ├── components/          AppIcon, AppLogo, PageHeader, StatCard, StatusBadge, AppDialog…
│   └── views/               auth/, account/, buyer/, seller/, admin/
└── tests/unit, tests/e2e
```

### Módulos (UML de clases)

```mermaid
classDiagram
    direction LR
    class App {
        elige AuthLayout, PanelLayout o ninguno
        según route.meta.layout
    }
    class router {
        <<module>>
        rutas planas con meta: guest, public, roles, layout
        beforeEach → resolveAccess()
    }
    class access {
        <<module>>
        resolveAccess(meta, role, path) string o null
        homeFor(role) string
        safeRedirect(value, fallback) string
    }
    class useAuthStore {
        <<Pinia>>
        user: User o null
        role, firstName
        ensureLoaded()
        login() register() logout()
    }
    class apiClient {
        <<module>>
        api: openapi-fetch con credentials include
        unwrap(promise) T
        ApiFailure: status, message, issues
    }
    class useForm {
        <<composable>>
        errors por campo
        message, submitting
        submit(action)
    }
    App --> router
    router --> access
    router --> useAuthStore
    useAuthStore --> apiClient
    useForm ..> apiClient : traduce ApiFailure
```

## 3. Rutas y acceso

| Ruta | Rol | Pantalla |
|---|---|---|
| `/ingresar`, `/registro`, `/recuperar` | Sin sesión | Ingreso, registro (elige comprador o propietario), recuperar contraseña |
| `/restablecer?token=` | Cualquiera | Contraseña nueva desde el correo |
| `/` | Con sesión | Lleva al inicio de su rol |
| `/mis-depas`, `/mis-consultas`, `/perfil` | Cualquier rol | Cuenta |
| `/mis-propiedades`, `/mis-propiedades/nueva`, `/mis-propiedades/:id`, `/:id/editar` | Propietario o admin | Sus solicitudes |
| `/admin`, `/admin/depas`, `/admin/depas/nuevo`, `/admin/depas/:id` | Admin | Resumen y catálogo |
| `/admin/solicitudes`, `/admin/solicitudes/:id` | Admin | Revisión de propietarios |
| `/admin/leads`, `/admin/reclamos`, `/admin/inmobiliarias`, `/admin/usuarios`, `/admin/configuracion` | Admin | Gestión |

```mermaid
flowchart TB
    N(("Navegación"))
    L["auth.ensureLoaded()<br/>GET /v1/auth/me una sola vez"]
    P{"¿meta.public?"}
    G{"¿meta.guest?"}
    S{"¿Tiene sesión?"}
    R{"¿Su rol está en meta.roles?"}
    OK(["Entra"])
    HOME(["Va al inicio de su rol<br/>homeFor(role)"])
    IN(["Va a /ingresar?volver=ruta"])

    N --> L --> P
    P -- sí --> OK
    P -- no --> G
    G -- sí --> S
    S -- "sí (ya ingresó)" --> HOME
    S -- no --> OK
    G -- no --> S2{"¿Tiene sesión?"}
    S2 -- no --> IN
    S2 -- sí --> R
    R -- sí --> OK
    R -- no --> HOME
```

Inicio de cada rol: comprador → `/mis-depas`, propietario → `/mis-propiedades`, admin → `/admin`.
`volver` solo acepta rutas internas: un link `?volver=https://otro-sitio` no redirige afuera.

**La seguridad real está en el API.** El panel oculta lo que no corresponde, pero cada endpoint
vuelve a comprobar la sesión y el rol.

## 4. Flujos de cuenta

### Crear cuenta e ingresar

```mermaid
sequenceDiagram
    autonumber
    actor P as Persona
    participant UI as Panel
    participant API as depahost-api
    participant DB as PostgreSQL

    P->>UI: /registro: elige "Quiero invertir" o "Tengo un depa"
    P->>UI: nombre, correo, celular, contraseña (10+), acepta privacidad
    UI->>API: POST /v1/auth/register con turnstileToken
    API->>API: Turnstile · correo en minúsculas · rol solo buyer o seller
    API->>DB: INSERT users con hash scrypt
    alt el correo ya existe
        API-->>UI: 409 "Ya existe una cuenta con ese correo"
    end
    API->>DB: INSERT sessions con id = SHA-256(token)
    API-->>UI: 201 User + Set-Cookie dh_session y dh_has_session
    UI->>P: va al inicio de su rol
```

`POST /v1/auth/login` hace lo mismo sin crear la cuenta. Si el correo no existe, verifica
igual contra un hash de relleno: la respuesta tarda lo mismo y dice lo mismo, así no revela qué
correos tienen cuenta.

### Recuperar la contraseña

```mermaid
sequenceDiagram
    autonumber
    actor P as Persona
    participant UI as Panel
    participant API as depahost-api
    participant M as Correo

    P->>UI: /recuperar con su correo
    UI->>API: POST /v1/auth/forgot-password
    API-->>UI: 202 siempre, exista o no la cuenta
    opt la cuenta existe
        API->>API: guarda SHA-256 de un token, vence en 1 hora
        API--)M: enlace PANEL_URL/restablecer?token=…
    end
    P->>UI: abre el enlace y escribe la contraseña nueva
    UI->>API: POST /v1/auth/reset-password
    API->>API: marca el token como usado · nuevo hash · cierra todas las sesiones
    API-->>UI: 204
```

### Mis depas: del navegador a la cuenta

```mermaid
sequenceDiagram
    autonumber
    participant S as Sitio (Header)
    participant LS as localStorage
    participant API as depahost-api

    S->>S: ¿existe la cookie dh_has_session=1?
    alt no
        S->>S: visitante anónimo, no llama al API
    else sí
        S->>API: GET /v1/auth/me
        alt 401 (sesión vencida)
            S->>S: borra el indicador
        else 200
            S->>S: "Hola, {nombre}" lleva al panel · oculta "Ingresar"
            S->>API: GET /v1/me/saved
            S->>LS: lee los guardados del navegador
            S->>S: une: primero los de la cuenta, luego los nuevos del navegador
            S->>API: PUT /v1/me/saved con la unión (si cambió)
            S->>LS: guarda la lista final (sin IDs que ya no existen)
            loop cada "Me interesa" o "Quitar"
                S->>API: PUT /v1/me/saved (agrupado cada 600 ms)
            end
        end
    end
```

El panel lee la misma lista con `GET /v1/me/saved` y los datos de cada depa con
`GET /v1/properties?ids=`. Quitar un depa en el panel hace `PUT` sin ese ID.

Los leads que se envían con sesión iniciada (Guarda tus depas, Te acompañamos, formularios)
quedan vinculados a la cuenta y aparecen en **Mis consultas** con su estado.

## 5. Solicitudes de propietarios

### Estados (UML)

```mermaid
stateDiagram-v2
    [*] --> submitted : el propietario la envía desde /mis-propiedades/nueva
    submitted --> submitted : el propietario la edita
    submitted --> in_review : el admin la pasa a revisión
    submitted --> rejected : el admin no la aprueba (con comentario)
    in_review --> rejected : el admin no la aprueba
    in_review --> approved : el admin la publica como depa
    submitted --> approved : el admin la publica directo
    rejected --> submitted : el propietario la corrige y la reenvía
    approved --> [*]

    note right of in_review
        El propietario ya no puede editarla
    end note
    note right of approved
        Queda vinculada al depa publicado.
        El propietario ve cuántas veces lo guardaron
        y cuántas consultas lo mencionan.
    end note
```

Cada cambio de estado envía un correo al propietario con el comentario del equipo.

### Del envío a la publicación

```mermaid
sequenceDiagram
    autonumber
    actor PR as Propietario
    actor AD as Admin
    participant UI as Panel
    participant API as depahost-api
    participant H as Sitio (build)

    PR->>UI: Publicar un depa: distrito, dirección, tipo, intención, precio, fotos
    opt fotos
        UI->>API: POST /v1/me/uploads
        API-->>UI: URL prefirmada de R2
        UI->>UI: PUT de la foto directo a R2
    end
    UI->>API: POST /v1/me/owner-requests
    API--)AD: correo "Nueva solicitud de propietario"
    AD->>UI: /admin/solicitudes → abre la solicitud → "Pasar a revisión"
    UI->>API: PATCH /v1/admin/owner-requests/{id} status in_review
    API--)PR: correo "Tu solicitud está en revisión"
    AD->>UI: "Publicar como depa"
    UI->>UI: /admin/depas/nuevo?solicitud={id} precargado (dirección, distrito, fotos…)
    AD->>UI: completa rentabilidad y plazo, elige Publicado
    UI->>API: POST /v1/admin/properties
    API--)H: deploy hook (reconstruye el sitio)
    UI->>API: PATCH /v1/admin/owner-requests/{id} status approved + propertyId
    API--)PR: correo "Tu solicitud fue aprobada y publicada"
    PR->>UI: /mis-propiedades/{id}: estado, link al sitio, guardados y consultas
```

## 6. Pantallas de administración

| Pantalla | Qué muestra | Acciones |
|---|---|---|
| Resumen | Leads sin contactar, reclamos pendientes y por vencer, solicitudes por revisar, depas publicados, cuentas por rol | Ir a cada lista |
| Depas | Todo el catálogo con búsqueda y filtros por estado y origen | Crear, editar, borrar, ver en el sitio |
| Formulario de depa | Ubicación y origen, números, presentación y fotos (con orden y portada) | Guardar como borrador o publicar |
| Solicitudes | Por estado, con datos del propietario | Pasar a revisión, publicar como depa, no aprobar con comentario, escribir por WhatsApp |
| Leads | Por estado y origen, con contacto y detalle desplegable | Mover por el embudo: sin contactar, en conversación, cerrado |
| Reclamos | Pendientes primero, con plazo y alerta de vencidos | Leer la hoja completa y responder por correo |
| Inmobiliarias | Nombre, descripción y proyectos | Crear y editar |
| Usuarios | Búsqueda por nombre o correo y filtro por rol | Cambiar el rol (nunca el propio) |
| Configuración | Supuestos de financiamiento con vista previa del texto del sitio, y distritos | Agregar supuestos y distritos |

## 7. Identidad visual

El panel usa el sistema de diseño del sitio, copiado con `pnpm sync:brand`:

| Del sitio | En el panel |
|---|---|
| `src/styles/tokens.css` | Colores, tipografías, espacios, radios, sombras |
| `src/styles/global.css` | `.btn`, `.form`, `.display`, `.eyebrow`, `.form-status`, `.sr-only` |
| `src/lib/icons.ts` | `AppIcon.vue` con los mismos trazos |
| `src/lib/format.ts` | Moneda, rentabilidad, años, fechas, nota de financiamiento |
| `src/data/distritos.ts` | Selector de distrito del propietario |
| `Logo.astro` | `AppLogo.vue` (copia manual del SVG) |

Decisiones visuales propias del panel: menú lateral blanco con el ítem activo en azul marino
claro y una barra a la izquierda; títulos de página en serif como Capital; la pantalla de ingreso
usa el azul marino del footer del sitio; las insignias de estado copian el estilo de las
etiquetas "DE PROPIETARIO".

## 8. Seguridad de las cuentas

| Medida | Detalle |
|---|---|
| Contraseñas | scrypt (N = 2^15, r = 8, p = 1) con sal aleatoria; mínimo 10 caracteres |
| Sesiones | Token aleatorio de 256 bits; en la base solo su SHA-256; 30 días, se extienden con el uso |
| Cookie | `httpOnly`, `SameSite=Lax`, `Secure` en producción, dominio `.depahostperu.com` |
| CSRF | Además de SameSite: los cambios con cookie deben venir de un origen de `CORS_ORIGINS` (si no, 403) |
| Enumeración de cuentas | Login y recuperación responden igual exista o no el correo |
| Límites | Registro 5/min, login 10/min, recuperar 5/min, cambio de contraseña 5/min por IP |
| Cambio o restablecimiento de contraseña | Cierra todas las demás sesiones |
| Roles | El registro solo crea compradores y propietarios; admin solo por otro admin o por `pnpm user:create` |
| Admin | Sesión con rol admin **o** la clave `ADMIN_API_KEY` (para scripts) |
| Panel | `noindex`, `X-Frame-Options: DENY`, sin almacenamiento de datos personales en el navegador |
