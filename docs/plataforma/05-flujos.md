# 05 · Flujos detalle a detalle

Cada flujo indica qué archivo hace cada paso, para que puedas seguirlo en el código.

El sitio no tiene cuentas ni login. Mis inmuebles, el historial de vistos y el nombre del saludo viven
solo en el navegador (`localStorage`). Los datos que deja la persona llegan como leads al panel de
DepaHost (repo `DH_panel`), que también es la fuente del catálogo. El API que usa el sitio está en
[03 · API](03-api.md).

**Índice**

1. [Recorrido completo del visitante](#1-recorrido-completo-del-visitante)
2. [Generar el sitio (build)](#2-generar-el-sitio-build)
3. [Publicar o editar un inmueble](#3-publicar-o-editar-un-inmueble)
4. [Buscar y filtrar](#4-buscar-y-filtrar)
5. [Me interesa](#5-me-interesa)
6. [Guarda tus inmuebles](#6-guarda-tus-inmuebles)
7. [Ver el detalle de un inmueble](#7-ver-el-detalle-de-un-inmueble)
8. [Para ti, según lo que has visto](#8-para-ti-según-lo-que-has-visto)
9. [Mis inmuebles](#9-mis-inmuebles)
10. [WhatsApp y sesión desde Mis inmuebles](#10-whatsapp-y-sesión-desde-mis-inmuebles)
11. [Formularios: propietarios y Libro de Reclamaciones](#11-formularios)
12. [Cambiar el contrato del API](#12-cambiar-el-contrato-del-api)
13. [Cookies y analítica](#13-cookies-y-analítica)
14. [Qué pasa cuando algo falla](#14-qué-pasa-cuando-algo-falla)

---

## 1. Recorrido completo del visitante

Este es el recorrido que diseñaste en el mock 5, con las páginas que lo implementan.

```mermaid
flowchart TB
    START(("Llega a Capital"))
    HOME["/capital<br/>inmuebles de propietarios"]
    BUSCA["Busca o filtra<br/>SearchFilters · /capital/inmuebles"]
    FICHA["Abre la ficha<br/>/capital/{slug}"]
    MARCA["Marca Me interesa<br/>SaveButton"]
    ACUM["Acumula en Mis inmuebles<br/>localStorage"]
    DEC{"¿Deja sus datos en<br/>Guarda tus inmuebles?"}
    NAV["Sigue navegando<br/>el navegador recuerda"]
    REG["Deja nombre y celular<br/>lead saved-list en el panel"]
    PERS["Capital personalizada<br/>Para ti, según lo que has visto · Hola, Ana"]
    ELIGE["Elige uno o varios<br/>/mis-inmuebles"]
    WA["Conversemos ahora o Programar una sesión<br/>WhatsApp · lead cart en el panel"]
    CIERRE(("Te acompañamos y cierras<br/>con el propietario"))

    START --> HOME
    HOME --> BUSCA & FICHA & MARCA
    BUSCA --> FICHA
    FICHA --> MARCA
    MARCA --> ACUM
    ACUM --> DEC
    DEC -- "no, Seguir viendo" --> NAV
    DEC -- "sí" --> REG
    NAV --> PERS
    REG --> PERS
    PERS --> ELIGE --> WA --> CIERRE
    FICHA -- "Contactar" --> ELIGE
```

Puntos de registro en el panel durante el recorrido (todos por `POST /api/v1/leads`):

| Momento | Lead | Datos personales |
|---|---|---|
| Deja sus datos en "Guarda tus inmuebles" | `saved-list` | Nombre, celular, correo opcional |
| Hace clic en "Conversemos ahora" en Mis inmuebles | `cart` | Ninguno: solo los IDs de los inmuebles |
| Envía "Programar una sesión" en Mis inmuebles | `cart` | Nombre, celular, día, horario y modalidad |
| Envía el formulario de propietarios | `owner-sell` | Nombre, celular, datos del inmueble |

`owner-rent` (alquiler o Airbnb) responde 201 pero el panel no lo registra: la persona sigue por
WhatsApp.

---

## 2. Generar el sitio (build)

Pasa cada vez que GitHub Actions mueve la rama `deploy/sitio` y cada vez que el panel llama al deploy
hook ("Actualizar web", flujo 3).

```mermaid
sequenceDiagram
    autonumber
    participant CF as Cloudflare Workers Builds
    participant A as Astro build
    participant L as Loader properties
    participant P as DH_panel
    participant SB as Supabase

    CF->>A: pnpm build con API_URL y PUBLIC_MEDIA_HOST
    Note over A: con WORKERS_CI, sin esas variables el build falla
    loop de 100 en 100
        L->>P: GET /api/v1/properties?page&pageSize=100
        P->>SB: rpc inmuebles_web (En cartera y autorizados)
        SB-->>P: inmuebles y fotos
        P-->>L: PropertyPage con URLs firmadas (6 horas)
    end
    L->>L: images[].url pasa a images[].src
    L->>A: valida cada item con Zod
    alt la respuesta cambió de forma
        A-->>CF: el build falla
    end
    Note over A: developers y financing salen de src/content
    A->>A: genera cada ruta con lib/properties.ts
    A->>SB: descarga las fotos y las optimiza (astro:assets)
    A->>A: /data/properties.json, sitemap, redirecciones
    A-->>CF: dist/ listo
    CF->>CF: npx wrangler deploy
```

Reglas importantes:

- **Sin `API_URL`:** el loader lee `src/content/properties.json`, que está vacío: el sitio funciona,
  pero sin inmuebles. Las pruebas e2e usan su propio catálogo con `CATALOG_DIR=tests/e2e/catalogo`.
- **Si el API falla durante el build, el build falla.** Es a propósito: es mejor no publicar que
  publicar un catálogo vacío. Cloudflare mantiene la versión anterior.
- **Fotos:** son URLs firmadas de Supabase Storage que caducan a las 6 horas. Por eso el build las
  descarga y las sirve optimizadas desde el sitio; necesita `PUBLIC_MEDIA_HOST` en
  `image.remotePatterns`.
- **Caché:** el panel responde con `s-maxage=300`. Un rebuild inmediato puede leer el catálogo
  anterior hasta 5 minutos.
- **Páginas que se generan:** una por inmueble que entrega el panel, una por inmobiliaria con
  proyectos (hoy ninguna) y el resto de rutas fijas.

---

## 3. Publicar o editar un inmueble

Se hace en el panel de DepaHost. El sitio no cambia hasta que alguien presiona "Actualizar web".

```mermaid
sequenceDiagram
    autonumber
    actor E as Equipo
    participant P as DH_panel
    participant SB as Supabase
    participant DH as Deploy hook
    participant CF as Cloudflare Workers Builds

    E->>P: Inmuebles → Nuevo inmueble (propietario, inmueble y contrato)
    P->>SB: lo guarda En cartera
    E->>P: sube las fotos en la ficha del inmueble
    P->>SB: Storage, bucket inmuebles
    E->>P: Actualizar web
    P->>DH: POST CLOUDFLARE_DEPLOY_HOOK_URL
    alt Cloudflare acepta
        P-->>E: "La web se está actualizando"
        DH->>CF: build de deploy/sitio, ver flujo 2 (unos 2 minutos)
    else falta la variable o Cloudflare rechaza
        P-->>E: mensaje de error, se puede reintentar
    end
```

- Solo se publican los inmuebles En cartera con autorización para publicar (rpc `inmuebles_web`).
- Editar o retirar un inmueble sigue el mismo camino: el cambio en el panel y luego "Actualizar web".
- El sitio nunca muestra la dirección exacta: en su lugar va el tipo de inmueble.

---

## 4. Buscar y filtrar

Funciona igual en la portada de Capital y en la página de cada inmobiliaria. No llama al API:
todas las tarjetas ya están en el HTML y el script solo las muestra u oculta.

```mermaid
sequenceDiagram
    autonumber
    actor V as Visitante
    participant UI as SearchFilters
    participant PF as scripts/property-filters.ts
    participant F as lib/filters.ts
    participant C as Tarjetas [data-property-card]

    Note over C: cada tarjeta trae data-search, data-district,<br/>data-price y data-yield-min desde el build
    V->>UI: escribe "miraflores" o toca un chip
    UI->>PF: evento input o click
    PF->>F: parseFilters(chips activos)
    loop por cada tarjeta
        PF->>F: matchesFilters(tarjeta, texto, filtros)
        F-->>PF: true o false
        PF->>C: hidden = !coincide
    end
    PF->>UI: contador "N proyectos encontrados"
    PF->>UI: muestra "Limpiar filtros" si hay algo activo
    PF->>UI: mensaje "No encontramos…" si no queda ninguna
```

Cómo se decide si una tarjeta coincide:

1. **Texto:** se normaliza sin tildes, en minúsculas y solo letras y números. "S/ 310,000" queda
   "s310000", así que buscar "310 000" o "310,000" encuentra el inmueble.
2. **Distrito:** el slug del chip debe ser igual al de la tarjeta.
3. **Precio máximo:** el precio de la tarjeta debe ser menor o igual.
4. Todos los criterios activos se combinan con "y".

La rentabilidad no es filtro rápido: está con el resto de filtros en "Todos los inmuebles" (`/capital/inmuebles`).

Cómo se arman los chips (en el build, `buildFastFilters`):

- Los 4 distritos con más inmuebles (a igualdad, los de mejor rentabilidad).
- Un tope de precio redondeado a S/ 50,000, cerca de la mediana, solo si deja fuera algún inmueble.

---

## 5. Me interesa

```mermaid
sequenceDiagram
    autonumber
    actor V as Visitante
    participant B as Botón Me interesa<br/>saved-buttons.ts
    participant ST as Mis inmuebles<br/>saved-store.ts
    participant HD as Header
    participant DL as Diálogo

    V->>B: clic
    B->>ST: toggle(id)
    alt ya estaba guardado
        ST->>ST: lo quita de localStorage
    else
        ST->>ST: lo agrega al final, máximo 20
    end
    ST-->>B: evento saved-depas-updated
    B->>V: Guardado, corazón lleno, aria-pressed true
    ST-->>HD: mismo evento: actualiza el contador
    ST-->>DL: mismo evento: ¿pasó a 2 o más? ver flujo 6
```

Si la persona tiene el sitio abierto en otra pestaña, el evento nativo `storage` actualiza esa
pestaña también. La lista no se sincroniza con ningún servidor: en otro navegador empieza vacía.

---

## 6. Guarda tus inmuebles

### Cuándo aparece (UML de estados)

```mermaid
stateDiagram-v2
    [*] --> Esperando
    Esperando --> Abierto : guarda el 2.º inmueble y shouldPrompt()
    Esperando --> Abierto : clic en "Guárdalos con tu celular"
    Abierto --> Enfriamiento : cierra, "Seguir viendo", Esc o clic afuera
    Abierto --> Completado : envío correcto
    Enfriamiento --> Esperando : pasaron 7 días
    Completado --> [*]

    note right of Enfriamiento
        Guarda depahost:save-prompt-dismissed
        con la fecha
    end note
    note right of Completado
        Guarda depahost:profile = { firstName }
        y ya no vuelve a preguntar
    end note
```

`shouldPrompt()` (en `lib/profile.ts`) responde **no** si ya hay perfil o si el aviso se cerró hace
menos de 7 días. El botón "Guárdalos con tu celular" de Mis inmuebles abre el diálogo siempre.

### Envío (UML de secuencia)

```mermaid
sequenceDiagram
    autonumber
    actor V as Visitante
    participant D as Diálogo<br/>SaveListDialog + forms.ts
    participant CAT as Catálogo JSON
    participant P as DH_panel
    participant SB as Supabase
    participant HD as Header

    D->>CAT: loadCatalog()
    CAT-->>D: nombres de los inmuebles guardados
    D->>V: 2 inmuebles seleccionados: Lince y Surquillo
    V->>D: nombre, celular, correo opcional, acepta privacidad
    V->>D: Guardar y continuar
    D->>D: validación nativa del navegador
    D->>P: POST /api/v1/leads (saved-list)
    P->>P: honeypot, validación y Turnstile
    P->>SB: rpc registrar_lead_web: crea o une el lead (canal Web)
    P-->>D: 201
    D->>D: profile.set("ana lucía") guarda firstName Ana
    D-->>HD: evento profile-updated
    HD->>V: Hola, Ana
    D->>V: Listo, Ana · Ver Mis inmuebles · Seguir viendo
```

El cuerpo del `POST` lleva `source: saved-list`, `name`, `phone`, `email` (opcional),
`propertyIds`, `consent`, `utm` y `turnstileToken`.

### Reglas del panel para cualquier lead

- `source` debe ser `saved-list`, `cart`, `contact`, `intl-form`, `owner-sell` u `owner-rent`.
- Valida nombre, celular (obligatorio si hay nombre), correo, `propertyIds` (UUID, máximo 20),
  `details` y `utm`. Un error responde 400 con `issues` por campo.
- **Honeypot:** si llega el campo oculto `website`, responde 201 sin registrar.
- **Turnstile:** si hay celular y el panel tiene `TURNSTILE_SECRET_KEY`, verifica el token.
- **CORS:** solo para los orígenes de `WEB_ORIGINS`.
- Sin celular solo guarda el interés por los inmuebles. No hay límite de envíos por IP (pendiente).

---

## 7. Ver el detalle de un inmueble

```mermaid
sequenceDiagram
    autonumber
    actor V as Visitante
    participant PG as /capital/{slug}<br/>(HTML del build)
    participant HS as getHistoryStore()
    participant LS as localStorage

    Note over PG: en el build ya se calcularon:<br/>datos, inmobiliaria, 4 similares y datos estructurados
    V->>PG: abre la ficha
    PG->>HS: touch(id)
    HS->>LS: mueve el id al final de depahost:viewed-depas (máximo 12)
    V->>PG: Me interesa (flujo 5)
    V->>PG: Contactar
    PG-->>V: /mis-inmuebles?agregar={id}: el inmueble entra a Mis inmuebles (flujo 10)
```

Qué muestra el detalle:

- **Etiqueta:** "De propietario" (hoy todos los del panel) o "De proyecto · {inmobiliaria}", más
  "Reservado" o el badge.
- **Tres datos con ícono:** valor ("Precio de compra" o "Precio desde"), rentabilidad en verde
  ("Estimada") y plazo ("Plazo de inversión").
- **Características:** dormitorios, baños y m², solo si existen.
- **Bloque de aliado:** la inmobiliaria con link a sus proyectos, o "Te acompaña · DepaHost
  Capital" si es de propietario.
- **Inmuebles similares:** los 4 más parecidos según `similarTo` (ver flujo 8).

---

## 8. Para ti, según lo que has visto

Aparece en `/capital` y, con el título "Parecidos a los que guardaste", en `/mis-inmuebles`.

```mermaid
sequenceDiagram
    autonumber
    participant R as ForYouRow
    participant ST as Mis inmuebles e historial
    participant CAT as /data/properties.json
    participant RC as lib/recommend.ts
    participant T as Plantilla MiniCard

    R->>ST: ¿hay historial o guardados?
    alt nada
        R->>R: la sección sigue oculta
    else
        R->>CAT: loadCatalog()
        CAT-->>R: CatalogItem[]
        R->>RC: recommend(catálogo, { viewed, saved }, 4)
        RC-->>R: hasta 4 inmuebles
        loop por cada inmueble
            R->>T: clona la plantilla y completa foto, título, precio, rentabilidad y plazo
        end
        R->>R: muestra la sección (u oculta si no hay resultados)
        R->>ST: se suscribe: si cambia Mis inmuebles, recalcula
    end
```

### Cómo se calcula (UML de actividad)

```mermaid
flowchart TB
    A["Señales:<br/>guardados (peso 2)<br/>últimos 6 vistos (peso 0.5 a 1.5, más reciente pesa más)"]
    B{"¿Hay alguna señal?"}
    C["Sin recomendaciones"]
    D["Para cada inmueble del catálogo<br/>que NO esté guardado"]
    E["puntaje = Σ peso × similitud(señal, inmueble)<br/>(se salta la señal si es el mismo inmueble)"]
    F{"¿Ya lo vio?"}
    G["puntaje × 0.6<br/>(lo nuevo va primero)"]
    H["Descarta puntaje 0<br/>ordena de mayor a menor<br/>toma los primeros 4"]

    A --> B
    B -- no --> C
    B -- sí --> D --> E --> F
    F -- sí --> G --> H
    F -- no --> H
```

**Similitud entre dos inmuebles** (`similarity` en `lib/recommend.ts`), de 0 a 7 puntos:

| Criterio | Puntos |
|---|---|
| Mismo distrito | 3 |
| Mismo origen (propietario o proyecto) | 1 |
| Precio cercano: `2 − 4 × diferencia relativa`, mínimo 0 | 0 a 2 |
| Rentabilidad cercana: `1 − diferencia en puntos / 3`, mínimo 0 | 0 a 1 |

Los "Inmuebles similares" del detalle usan la misma función, pero en el build y con un solo inmueble
como referencia (`similarTo`).

---

## 9. Mis inmuebles

```mermaid
sequenceDiagram
    autonumber
    actor V as Visitante
    participant P as /mis-inmuebles
    participant ST as getSavedStore()
    participant CAT as /data/properties.json
    participant T as Plantilla SavedDepa
    participant PR as lib/profile.ts

    V->>P: abre Mis inmuebles
    P->>PR: ¿hay nombre?
    PR-->>P: nota "Guardado para Ana" o "Guardado en este dispositivo"
    P->>CAT: loadCatalog()
    CAT-->>P: CatalogItem[]
    P->>ST: list()
    P->>ST: quita los IDs que ya no existen (vendidos o retirados)
    loop por cada guardado, en orden
        P->>T: clona la plantilla: foto, ubicación, datos con ícono, descripción, precio
    end
    P->>P: resumen: cantidad, lista con precios, inversión total por moneda
    alt nada elegido
        P->>V: mensaje vacío · botones deshabilitados
    else
        P->>V: "Conversemos ahora" con el link de WhatsApp armado (flujo 10)
    end
    V->>P: Quitar (X)
    P->>ST: remove(id) · se vuelve a pintar todo
```

La inversión total suma por moneda. Si hay inmuebles en soles y en dólares, muestra
"S/ 595,000 + US$ 80,000".

---

## 10. WhatsApp y sesión desde Mis inmuebles

"Te acompañamos" (`/capital/empecemos`) se unió a Mis inmuebles: la lista es el último paso y desde ahí
se escribe por WhatsApp o se pide una sesión. `/capital/empecemos` y `/carrito` redirigen a
`/mis-inmuebles`.

```mermaid
sequenceDiagram
    autonumber
    actor V as Visitante
    participant P as /mis-inmuebles
    participant ST as Mis inmuebles
    participant PN as DH_panel
    participant WA as WhatsApp

    alt llega desde "Contactar" del detalle
        V->>P: /mis-inmuebles?agregar={id}
        P->>ST: add(id) · limpia la URL
    end
    P->>V: lista, resumen y botones con el mensaje armado
    alt Conversemos ahora
        par
            P-)PN: POST /api/v1/leads { source: cart, propertyIds } (sin esperar)
        and
            P->>WA: abre wa.me/{número}?text=…
        end
    else Programar una sesión
        V->>P: nombre, celular, día, horario y modalidad (ScheduleDialog)
        P->>PN: POST /api/v1/leads { source: cart, details.contacto "Programar una sesión" }
        PN-->>P: 201 · confirmación con día y horario
    end
```

- El mensaje de WhatsApp incluye cada inmueble con distrito, dirección y precio.
- Sin inmuebles elegidos los botones están deshabilitados y la página invita a explorar.
- El lead de "Conversemos ahora" no lleva datos personales ni captcha. Si el panel falla, WhatsApp se
  abre igual.

---

## 11. Formularios

### Flujo común (`scripts/forms.ts`, UML de actividad)

Todos los formularios que envían al API usan `enhanceForm`.

```mermaid
flowchart TB
    S(("submit"))
    A["Evita el envío nativo<br/>limpia errores anteriores"]
    B{"¿Pasa la validación<br/>del navegador?"}
    B1["El navegador marca el campo"]
    C["formToObject: name con puntos → JSON anidado<br/>número, booleano, sin vacíos<br/>cf-turnstile-response → turnstileToken"]
    D{"¿Hay PUBLIC_API_URL?"}
    D1["'Por ahora recibimos estas consultas por WhatsApp'<br/>+ link con el mensaje armado"]
    E["Botón deshabilitado · 'Enviando…'<br/>POST al API"]
    F{"Respuesta"}
    G["onSuccess del formulario"]
    H["'Espera un minuto'"]
    I["Errores por campo:<br/>aria-invalid + texto bajo el campo"]
    J["Mensaje de error + link de WhatsApp"]
    K["Reinicia Turnstile"]
    L["Rehabilita el botón"]

    S --> A --> B
    B -- no --> B1
    B -- sí --> C --> D
    D -- no --> D1
    D -- sí --> E --> F
    F -- 2xx --> G --> L
    F -- 429 --> H --> K
    F -- "400 con issues" --> I --> K
    F -- "otro error o sin red" --> J --> K
    K --> L
```

El panel hoy no responde 429 (no limita por IP), pero el sitio ya maneja ese caso.

### Los formularios

| Formulario | Página | Payload | Al terminar |
|---|---|---|---|
| Propietarios | `/propietarios` | `owner-sell` si "Vender"; `owner-rent` si "Alquilar" o "Airbnb"; `details: { district, propertyType, intent, expectedPrice }` | "Te escribimos por WhatsApp" + link |
| Guarda tus inmuebles | Diálogo global | `saved-list` + `propertyIds` | Saludo y paso "Listo" (flujo 6) |
| Programar una sesión | Diálogo de `/mis-inmuebles` | `cart` + `details: { contacto, fecha, horario, modalidad }` | Confirmación con el día y el horario (flujo 10) |
| Libro de Reclamaciones | `/libro-de-reclamaciones` | `consumer`, `item`, `kind`, `detail`, `request`, `consent` | Hoy falla: ver abajo |

En Propietarios, los botones "Quiero vender" y "Poner en alquiler" eligen la opción del select y
llevan el foco al nombre. Las URLs `/propietarios#vender` y `#alquiler` también la preseleccionan.
Si eligen alquiler o Airbnb, el campo de precio pasa a "Alquiler mensual esperado". El panel responde
201 a `owner-rent` pero no lo registra.

### Libro de Reclamaciones

El formulario envía `POST /v1/complaints`, pero el panel todavía no implementa esa ruta. Hoy el envío
termina en error y el sitio ofrece WhatsApp con el mensaje armado. Es un pendiente legal: INDECOPI
exige un código correlativo y una constancia.

```mermaid
sequenceDiagram
    autonumber
    actor C as Consumidor
    participant F as Formulario
    participant P as DH_panel

    C->>F: completa datos, bien contratado, detalle y pedido
    opt es menor de edad
        F->>C: pide nombre del padre, madre o apoderado
    end
    C->>F: Enviar reclamo
    F->>P: POST /v1/complaints
    P-->>F: la ruta no existe
    F->>C: mensaje de error + link de WhatsApp
    Note over F: cuando exista la ruta, el 201 { code, responseDeadline }<br/>muestra la constancia imprimible
```

---

## 12. Cambiar el contrato del API

El contrato vive en este repo, en `openapi/depahost-api.json`, y es la fuente de verdad. El panel
implementa a mano la parte que el sitio usa.

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Desarrollador
    participant FE as Repo DHC_landing
    participant TS as TypeScript
    participant P as Repo DH_panel

    Dev->>FE: edita openapi/depahost-api.json
    Dev->>FE: pnpm api:types
    FE->>FE: openapi-typescript genera src/lib/api/schema.d.ts
    Dev->>FE: pnpm check
    TS-->>Dev: errores donde el sitio usa algo que cambió
    Dev->>FE: ajusta content.config.ts, loaders y componentes
    Dev->>P: ajusta app/api/v1/properties o app/api/v1/leads
    opt probar sin el panel
        Dev->>FE: pnpm api:mock (Prism en :4010)
    end
```

---

## 13. Cookies y analítica

```mermaid
stateDiagram-v2
    [*] --> SinElegir : primera visita
    SinElegir --> Aceptado : "Aceptar"
    SinElegir --> Rechazado : "Rechazar"
    Aceptado --> SinElegir : "Preferencias de cookies" en el footer
    Rechazado --> SinElegir : "Preferencias de cookies" en el footer
    Aceptado --> Aceptado : cada visita carga Clarity

    note right of SinElegir
        Se muestra el banner.
        Clarity NO se carga.
    end note
    note right of Aceptado
        depahost:consent = granted
        Se inserta el script de Clarity
        (solo si hay PUBLIC_CLARITY_ID)
    end note
    note right of Rechazado
        depahost:consent = denied
    end note
```

Sentry (errores del navegador) no depende del consentimiento: no envía datos personales y solo
se carga si hay `PUBLIC_SENTRY_DSN`.

---

## 14. Qué pasa cuando algo falla

| Situación | Qué pasa | Qué ve la persona |
|---|---|---|
| El panel no responde durante el build | El build falla y Cloudflare mantiene la versión anterior | Nada cambia |
| La respuesta del panel cambió de forma | El esquema de `content.config.ts` rechaza los datos y el build falla | Nada cambia |
| Faltan `API_URL` o `PUBLIC_MEDIA_HOST` en Cloudflare | El build falla a propósito (`WORKERS_CI`) | Nada cambia |
| `PUBLIC_API_URL` vacío | Los formularios no envían y ofrecen WhatsApp | "Por ahora recibimos estas consultas por WhatsApp" |
| El panel cae mientras alguien llena un formulario | Error de red | Mensaje de error + link de WhatsApp con su mensaje |
| Un campo no pasa la validación del panel | 400 con `issues` | El campo se marca con el mensaje del panel |
| Falla Turnstile | 400 | "No pudimos verificar que no eres un robot…" |
| Envía un reclamo | La ruta no existe en el panel | Mensaje de error + link de WhatsApp |
| No carga `/data/properties.json` | Mis inmuebles muestra un aviso; Para ti queda oculta | "No pudimos cargar tus inmuebles guardados" |
| Un inmueble guardado ya no existe | Se quita solo de Mis inmuebles | No aparece |
| `localStorage` bloqueado | Las listas funcionan en memoria en esa página | Mis inmuebles se vacía al recargar |
| "Actualizar web" falla | El panel muestra el error (falta `CLOUDFLARE_DEPLOY_HOOK_URL` o Cloudflare lo rechazó) | El cambio no aparece hasta el próximo build |
| Rebuild justo después de un cambio | La caché del panel (`s-maxage=300`) puede servir el catálogo anterior | El cambio aparece en el siguiente build |
