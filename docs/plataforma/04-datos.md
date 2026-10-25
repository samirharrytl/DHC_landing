# 04 · Datos

Los datos viven en tres lugares. Cada uno guarda cosas distintas a propósito.

| Lugar | Qué guarda | Quién lo ve |
|---|---|---|
| PostgreSQL (API) | Inmuebles, fotos, distritos, inmobiliarias, leads, reclamos, supuestos | El equipo, vía API |
| HTML y JSON estáticos (build) | Copia pública del catálogo, ya formateada | Todo el mundo |
| Navegador del visitante | Mis inmuebles, historial, nombre, consentimiento, UTM | Solo esa persona, en ese dispositivo |

## 1. Base de datos (diagrama entidad-relación)

```mermaid
erDiagram
    districts ||--o{ properties : "ubica"
    developers |o--o{ properties : "publica proyectos"
    properties ||--o{ property_images : "tiene fotos"
    leads }o..o{ properties : "property_ids (sin FK)"
    users ||--o{ sessions : "inicia"
    users ||--o{ password_resets : "pide"
    users ||--o{ saved_properties : "guarda"
    properties ||--o{ saved_properties : "es guardado"
    users ||--o{ owner_requests : "envía"
    properties |o--o| owner_requests : "se publica como"
    users |o--o{ leads : "envía con sesión"

    districts {
        uuid id PK
        text name
        text slug UK
        timestamptz created_at
    }
    developers {
        uuid id PK
        text name
        text slug UK
        text description "nullable"
        text logo_url "nullable"
        text website "nullable"
        timestamptz created_at
    }
    properties {
        uuid id PK
        text slug UK
        uuid district_id FK
        property_origin origin "owner o developer"
        uuid developer_id FK "nullable, set null al borrar"
        text address
        text badge "nullable"
        text description "nullable"
        integer price_amount
        currency price_currency "PEN o USD"
        float yield_min
        float yield_max
        float payback_years
        float area_m2 "nullable"
        integer bedrooms "nullable"
        float bathrooms "nullable"
        property_status status "draft published reserved sold"
        boolean featured
        timestamptz published_at "nullable"
        timestamptz created_at
        timestamptz updated_at
    }
    property_images {
        uuid id PK
        uuid property_id FK "cascade al borrar"
        text url
        text alt
        integer width "nullable"
        integer height "nullable"
        integer position
    }
    users {
        uuid id PK
        text email UK "en minúsculas"
        text password_hash "scrypt"
        text name
        text phone "nullable"
        user_role role "buyer seller admin"
        timestamptz created_at
        timestamptz last_login_at "nullable"
    }
    sessions {
        text id PK "SHA-256 del token"
        uuid user_id FK "cascade"
        timestamptz expires_at
        text user_agent "nullable"
        timestamptz created_at
    }
    password_resets {
        text id PK "SHA-256 del token"
        uuid user_id FK "cascade"
        timestamptz expires_at "1 hora"
        timestamptz used_at "nullable"
        timestamptz created_at
    }
    saved_properties {
        uuid user_id PK "y FK"
        uuid property_id PK "y FK"
        timestamptz created_at "orden de guardado"
    }
    owner_requests {
        uuid id PK
        uuid user_id FK "cascade"
        text district
        text address
        text property_type
        owner_intent intent "sell rent airbnb"
        integer expected_price "nullable"
        float area_m2 "nullable"
        integer bedrooms "nullable"
        float bathrooms "nullable"
        text description "nullable"
        jsonb photos "url y alt"
        owner_request_status status "submitted in_review approved rejected"
        text admin_note "nullable"
        uuid property_id FK "nullable, inmueble publicado"
        timestamptz created_at
        timestamptz updated_at
    }
    leads {
        uuid id PK
        lead_source source
        uuid user_id FK "nullable, si tenía sesión"
        lead_status status "new contacted closed"
        text name "nullable"
        text email "nullable"
        text phone "nullable"
        integer amount_usd "nullable"
        uuid_array property_ids
        text message "nullable"
        jsonb details "nullable"
        text locale
        jsonb utm "nullable"
        timestamptz consent_at "nullable"
        timestamptz created_at
    }
    complaints {
        uuid id PK
        text code UK "LR-2026-000001"
        text first_name
        text last_name
        document_type document_type "DNI CE PASAPORTE RUC"
        text document_number
        text address
        text phone
        text email
        boolean is_minor
        text guardian_name "nullable"
        complaint_item_type item_type "producto o servicio"
        text item_description
        float amount_claimed "nullable"
        complaint_kind kind "reclamo o queja"
        text detail
        text request
        complaint_status status "pending o answered"
        text response "nullable"
        timestamptz responded_at "nullable"
        date response_deadline
        timestamptz consent_at
        timestamptz created_at
    }
    financing_assumptions {
        uuid id PK
        float rate "nullable"
        float down_payment_pct "nullable"
        integer term_years "nullable"
        date as_of
        timestamptz created_at
    }
```

Además hay una **secuencia** `complaint_seq` que da el correlativo de los reclamos, y estos enums:

| Enum | Valores |
|---|---|
| `property_status` | `draft`, `published`, `reserved`, `sold` |
| `property_origin` | `owner`, `developer` |
| `currency` | `PEN`, `USD` |
| `lead_source` | `intl-form`, `owner-sell`, `owner-rent`, `cart`, `contact`, `saved-list` |
| `user_role` | `buyer`, `seller`, `admin` |
| `lead_status` | `new`, `contacted`, `closed` |
| `owner_intent` | `sell`, `rent`, `airbnb` |
| `owner_request_status` | `submitted`, `in_review`, `approved`, `rejected` |
| `complaint_kind` | `reclamo`, `queja` |
| `complaint_item_type` | `producto`, `servicio` |
| `complaint_status` | `pending`, `answered` |
| `document_type` | `DNI`, `CE`, `PASAPORTE`, `RUC` |

Índices: `properties` por `status`, `district_id` y `developer_id`; `property_images` por
`property_id`; `leads` por `created_at`; `complaints` por `status`.

### Migraciones

| Archivo | Cambios |
|---|---|
| `drizzle/0000_init.sql` | Tablas base, enums y secuencia |
| `drizzle/0001_developers.sql` | Tabla `developers`, `properties.origin`, `properties.developer_id` y el valor `saved-list` en `lead_source` |
| `drizzle/0002_accounts.sql` | Tablas `users`, `sessions`, `password_resets`, `saved_properties` y `owner_requests`; `leads.user_id` y `leads.status` |
| `drizzle/0003_rls.sql` | RLS activado, sin políticas, en las 12 tablas |

**Por qué RLS:** en Supabase, la Data API publica el esquema `public` a cualquiera con la clave
pública del proyecto. Con RLS activado y sin políticas, esa vía no devuelve nada. El API se conecta
como dueño de las tablas, y a los dueños no se les aplica RLS. Cada tabla nueva lleva `.enableRLS()`
en `schema.ts`; `test/database.test.ts` falla si alguna lo olvida.

## 2. Ciclo de vida de un inmueble (UML de estados)

```mermaid
stateDiagram-v2
    [*] --> draft : POST /v1/admin/properties (status por defecto)
    [*] --> published : POST con status published
    draft --> published : PATCH status published · fija publishedAt · rebuild
    published --> reserved : PATCH status reserved · rebuild
    reserved --> published : PATCH status published · rebuild
    published --> sold : PATCH status sold · rebuild
    reserved --> sold : PATCH status sold · rebuild
    sold --> published : PATCH (vuelve a la venta) · rebuild
    draft --> [*] : DELETE (sin rebuild)
    published --> [*] : DELETE · rebuild
    reserved --> [*] : DELETE · rebuild
    sold --> [*] : DELETE · rebuild

    note right of draft
        No aparece en ninguna parte del sitio
    end note
    note right of reserved
        Sale en el catálogo con la etiqueta "Reservado"
    end note
    note right of sold
        El API la devuelve en el detalle, pero el sitio
        no la incluye en el build (getProperties la excluye)
    end note
```

## 3. Esquemas del contrato (UML de clases)

Estas son las formas que viajan por HTTP. Salen de los esquemas Zod del API.

```mermaid
classDiagram
    direction LR

    class Property {
        id: uuid
        slug: string
        district: District
        origin: owner | developer
        developer: DeveloperRef | null
        address: string
        badge: string | null
        description: string | null
        price: Price
        yield: Yield
        paybackYears: number
        areaM2: number | null
        bedrooms: int | null
        bathrooms: number | null
        images: PropertyImage[]
        status: published | reserved | sold
        featured: boolean
        publishedAt: datetime
    }
    class District {
        id: uuid
        name: string
        slug: string
    }
    class DeveloperRef {
        id: uuid
        slug: string
        name: string
    }
    class Developer {
        id: uuid
        slug: string
        name: string
        description: string | null
        logoUrl: url | null
        website: url | null
        projectCount: int
    }
    class Price {
        amount: int
        currency: PEN | USD
    }
    class Yield {
        min: number
        max: number
    }
    class PropertyImage {
        url: url
        alt: string
        width: int | null
        height: int | null
    }
    class LeadCreate {
        source: LeadSource
        name?: string
        email?: email
        phone?: string
        amountUsd?: int
        propertyIds?: uuid[]
        message?: string
        details?: map
        locale: es | en
        consent: boolean
        utm?: Utm
        turnstileToken?: string
        website?: string
    }
    class ComplaintCreate {
        consumer: Consumer
        item: Item
        kind: reclamo | queja
        detail: string
        request: string
        consent: true
        turnstileToken?: string
        website?: string
    }
    class ComplaintReceipt {
        code: string
        createdAt: datetime
        responseDeadline: date
    }
    class FinancingAssumptions {
        rate: number | null
        downPaymentPct: number | null
        termYears: int | null
        asOf: date | null
    }

    Property *-- District
    Property *-- Price
    Property *-- Yield
    Property *-- "0..*" PropertyImage
    Property o-- "0..1" DeveloperRef
    DeveloperRef .. Developer : resumen de
    ComplaintCreate ..> ComplaintReceipt : responde
```

## 4. Datos en el frontend

### De la API al sitio

El loader del build convierte cada `Property` del API en una entrada de la colección
`properties`. El único cambio es en las fotos: `images[].url` pasa a `images[].src`, porque el
mismo campo también acepta fotos locales (`../assets/…`) cuando no hay API.

```mermaid
flowchart LR
    A["API · Property<br/>images[].url"] -- "hybridLoader" --> B["Colección properties<br/>images[].src"]
    J["src/content/properties.json<br/>images[].src = ../assets/…"] -- "sin API_URL" --> B
    B -- "getProperties()" --> C["Páginas .astro"]
    B -- "getProperties() + getImage()" --> D["/data/properties.json<br/>CatalogItem[]"]
```

### Catálogo liviano (`/data/properties.json`)

Lo genera `src/pages/data/properties.json.ts` en el build. Lo usan Mis inmuebles, Te acompañamos,
"Para ti" y el diálogo "Guarda tus inmuebles". Los textos ya vienen formateados, para que el
navegador no tenga que calcular nada.

| Campo | Ejemplo |
|---|---|
| `id`, `slug`, `url` | `05429e0c-…`, `lince-av-arequipa-cuadra-12`, `/capital/lince-av-arequipa-cuadra-12` |
| `district`, `districtSlug` | `Lince`, `lince` |
| `origin`, `developer` | `owner`, `null` · o `developer`, `{ name: "Urbana", slug: "urbana" }` |
| `address`, `badge`, `description`, `status` | `Av. Arequipa cuadra 12`, `Súper precio`, `null`, `published` |
| `price` | `{ amount: 310000, currency: "PEN", label: "S/ 310,000" }` |
| `yield`, `yieldLabel` | `{ min: 8, max: 10 }`, `8–10% anual` |
| `paybackLabel` | `Se paga en 11 años` |
| `facts` | `["2 dorm.", "2 baños", "68 m²"]` (vacío si no hay datos) |
| `image` | `{ src, srcset, alt }` en WebP de 320, 480 y 640 px, o `null` |

### Lo que se guarda en el navegador

| Clave | Almacenamiento | Contenido | Escribe | Lee |
|---|---|---|---|---|
| `depahost:saved-depas:v2` | localStorage | IDs de Mis inmuebles (máximo 20, el más nuevo al final) | Me interesa, Quitar | Header, Mis inmuebles, Te acompañamos, Para ti, diálogo |
| `depahost:viewed-depas` | localStorage | IDs de inmuebles abiertos (máximo 12, el más reciente al final) | Detalle del inmueble | Para ti |
| `depahost:profile` | localStorage | `{ firstName }` | Diálogo "Guarda tus inmuebles" | Header, Mis inmuebles |
| `depahost:save-prompt-dismissed` | localStorage | Fecha en que se cerró el diálogo | Diálogo | Diálogo (espera 7 días) |
| `depahost:consent` | localStorage | `granted` o `denied` | Banner de cookies | Banner, carga de Clarity |
| `depahost:utm` | sessionStorage | UTM de la primera página de la visita | Formularios | Todos los leads |
| `dh_session` | Cookie `httpOnly` (la pone el API) | Token de sesión. JavaScript no puede leerla | API al ingresar | API en cada llamada con `credentials: 'include'` |
| `dh_has_session` | Cookie legible (la pone el API) | `1` mientras hay sesión, sin secretos | API | Header del sitio: decide si preguntar quién es |

Con sesión iniciada, "Mis inmuebles" también vive en la tabla `saved_properties` y se sincroniza con
el navegador (ver [08 · Panel y cuentas](08-panel-y-cuentas.md#mis-inmuebles-del-navegador-a-la-cuenta)).

Eventos del navegador (`window`):

| Evento | Se dispara | Lo escuchan |
|---|---|---|
| `depahost:saved-depas-updated` | Al cambiar Mis inmuebles | Header, botones Me interesa, Mis inmuebles, Para ti, diálogo |
| `depahost:viewed-depas-updated` | Al abrir un inmueble | — (disponible) |
| `depahost:profile-updated` | Al guardar o borrar el nombre | Header, Mis inmuebles |
| `storage` (nativo) | Al cambiar la clave en otra pestaña | Los mismos suscriptores de Mis inmuebles |

Si `localStorage` no existe o está bloqueado (modo privado), las listas funcionan en memoria
mientras la página esté abierta.

**Privacidad:** el navegador guarda solo el primer nombre. Celular, correo y consentimiento
completo quedan en el API como lead.

## 5. Datos de ejemplo (demostración)

Mientras no haya datos reales, el sitio y el seed del API usan los mismos datos de ejemplo:

| Tipo | Contenido | Estado |
|---|---|---|
| Inmuebles de propietarios | Lince, Surquillo y Magdalena con fotos | Precios, rentabilidad y plazos de ejemplo |
| Inmobiliarias | Urbana, Lima Sur, Andes, Miraflores Hotel, Nova | Nombres provisionales, sin logos ni descripción |
| Proyectos de Urbana | San Miguel, Miraflores y Surquillo | Precios y textos del mock. Las fotos son las de otros inmuebles |
| Supuestos de financiamiento | Vacíos | El sitio muestra `[plazo]`, `[X]` y `[fecha]` |

Todo esto debe reemplazarse antes de publicar. Ver [07 · Pendientes](07-decisiones-y-pendientes.md#pendientes).
