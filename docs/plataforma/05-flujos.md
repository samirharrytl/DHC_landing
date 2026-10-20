# 05 · Flujos detalle a detalle

Cada flujo indica qué archivo hace cada paso, para que puedas seguirlo en el código.

Los flujos de cuentas y del panel (crear cuenta, ingresar, recuperar la contraseña, sincronizar
Mis depas con la cuenta y publicar un depa como propietario) están en
[08 · Panel y cuentas](08-panel-y-cuentas.md#4-flujos-de-cuenta).

**Índice**

1. [Recorrido completo del visitante](#1-recorrido-completo-del-visitante)
2. [Generar el sitio (build)](#2-generar-el-sitio-build)
3. [Publicar o editar un depa](#3-publicar-o-editar-un-depa)
4. [Subir fotos](#4-subir-fotos)
5. [Buscar y filtrar](#5-buscar-y-filtrar)
6. [Me interesa](#6-me-interesa)
7. [Guarda tus depas](#7-guarda-tus-depas)
8. [Ver el detalle de un depa](#8-ver-el-detalle-de-un-depa)
9. [Para ti, según lo que has visto](#9-para-ti-según-lo-que-has-visto)
10. [Mis depas](#10-mis-depas)
11. [Te acompañamos y WhatsApp](#11-te-acompañamos-y-whatsapp)
12. [Formularios: inglés, propietarios y Libro de Reclamaciones](#12-formularios)
13. [Cambiar el contrato del API](#13-cambiar-el-contrato-del-api)
14. [Cookies y analítica](#14-cookies-y-analítica)
15. [Qué pasa cuando algo falla](#15-qué-pasa-cuando-algo-falla)

---

## 1. Recorrido completo del visitante

Este es el recorrido que diseñaste en el mock 5, con las páginas que lo implementan.

```mermaid
flowchart TB
    START(("Llega a Capital"))
    HOME["/capital<br/>depas de propietarios"]
    BUSCA["Busca o filtra<br/>SearchFilters"]
    FICHA["Abre la ficha<br/>/capital/{slug}"]
    MARCA["Marca Me interesa<br/>SaveButton"]
    ALIADO["Clic en un aliado<br/>/capital/aliados/{slug}"]
    ACUM["Acumula en Mis depas<br/>localStorage"]
    DEC{"¿Deja sus datos en<br/>Guarda tus depas?"}
    NAV["Sigue navegando<br/>el navegador recuerda"]
    REG["Deja nombre y celular<br/>lead saved-list en el API"]
    PERS["Capital personalizada<br/>Para ti, según lo que has visto · Hola, Ana"]
    ELIGE["Elige uno o varios<br/>/mis-depas"]
    EMP["Empecemos con estos<br/>/capital/empecemos"]
    WA["Escribir por WhatsApp<br/>lead cart en el API"]
    CIERRE(("Te acompañamos y cierras<br/>con la inmobiliaria o el propietario"))

    START --> HOME
    HOME --> BUSCA & FICHA & MARCA & ALIADO
    BUSCA --> FICHA
    ALIADO --> FICHA
    FICHA --> MARCA
    MARCA --> ACUM
    ACUM --> DEC
    DEC -- "no, Seguir viendo" --> NAV
    DEC -- "sí" --> REG
    NAV --> PERS
    REG --> PERS
    PERS --> ELIGE --> EMP --> WA --> CIERRE
    FICHA -- "Contactar" --> EMP
```

Puntos de registro en el API durante el recorrido:

| Momento | Lead | Datos personales |
|---|---|---|
| Deja sus datos en "Guarda tus depas" | `saved-list` | Nombre, celular, correo opcional |
| Hace clic en "Escribir por WhatsApp" en Te acompañamos | `cart` | Ninguno: solo los IDs de los depas |
| Envía el formulario en inglés | `intl-form` | Nombre, correo, monto |
| Envía el formulario de propietarios | `owner-sell` u `owner-rent` | Nombre, celular, datos del depa |

---

## 2. Generar el sitio (build)

Pasa al publicar el frontend, al subir cambios a `main` y cada vez que el API llama al deploy hook.

```mermaid
sequenceDiagram
    autonumber
    participant H as Hosting
    participant A as Astro build
    participant L as Loaders
    participant API as depahost-api
    participant PG as Páginas

    H->>A: pnpm build con API_URL
    par colección properties
        loop de 100 en 100
            L->>API: GET /v1/properties
            API-->>L: PropertyPage
        end
    and colección developers
        L->>API: GET /v1/developers
        API-->>L: Developer[]
    and colección financing
        L->>API: GET /v1/financing-assumptions
        API-->>L: supuestos o 404
    end
    L->>L: images[].url pasa a images[].src
    L->>A: valida cada item con Zod
    alt el API cambió de forma
        A-->>H: el build falla
    end
    A->>PG: genera cada ruta con lib/properties.ts
    PG->>A: pide fotos optimizadas a astro:assets
    A->>A: /data/properties.json, sitemap, redirección /carrito
    A-->>H: dist/ listo
```

Reglas importantes:

- **Sin `API_URL`:** los loaders leen `src/content/*.json`. En desarrollo, editar esos JSON
  recarga el sitio solo.
- **Si el API falla durante el build, el build falla.** Es a propósito: es mejor no publicar que
  publicar datos viejos o de ejemplo.
- **Páginas que se generan:** una por depa visible, una por inmobiliaria con proyectos, y el resto
  de rutas fijas. Los depas vendidos no generan página.

---

## 3. Publicar o editar un depa

Hoy no hay panel visual: se usa `/docs` del API, Drizzle Studio o cualquier cliente HTTP con la
clave de administración.

```mermaid
sequenceDiagram
    autonumber
    actor E as Equipo
    participant API as depahost-api
    participant DB as PostgreSQL
    participant DH as Deploy hook
    participant H as Hosting

    E->>API: POST /v1/admin/properties con Bearer ADMIN_API_KEY
    API->>API: admin-auth compara la clave
    API->>DB: ¿existe el distrito? ¿y la inmobiliaria, si es proyecto?
    API->>DB: ¿slug libre? si no, agrega -2, -3…
    API->>DB: INSERT depa y fotos en una transacción
    API-->>E: 201 AdminProperty
    alt el depa no es borrador
        API->>DH: triggerDeploy create
        Note over DH: espera 30 s por si llegan más cambios
        E->>API: PATCH de otro depa dentro de esos 30 s
        API->>DH: triggerDeploy update, reinicia la espera
        DH->>H: POST DEPLOY_HOOK_URL, una sola vez
        H->>H: build, ver flujo 2
    end
```

El mismo patrón aplica a editar (`PATCH`), borrar (`DELETE`), crear o editar inmobiliarias y
agregar supuestos de financiamiento. Editar un borrador que sigue siendo borrador no reconstruye
el sitio, porque no cambia nada visible.

---

## 4. Subir fotos

```mermaid
sequenceDiagram
    autonumber
    actor E as Equipo (panel o script)
    participant API as depahost-api
    participant R2 as Cloudflare R2

    E->>API: POST /v1/admin/uploads { filename, contentType }
    alt R2 no configurado
        API-->>E: 503
    else
        API->>API: arma la clave properties/{uuid}-{nombre}.{ext}
        API-->>E: { uploadUrl (10 min), publicUrl, key }
        E->>R2: PUT uploadUrl con el archivo
        R2-->>E: 200
        E->>API: PATCH /v1/admin/properties/{id} { images: [{ url: publicUrl, alt }] }
        API-->>E: 200 · dispara el rebuild
    end
```

En el build, Astro descarga la foto desde R2 y la sirve optimizada desde el hosting. Para que
lo permita, el dominio de las fotos debe estar en `image.remotePatterns` (`*.r2.dev` o
`PUBLIC_MEDIA_HOST`).

---

## 5. Buscar y filtrar

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
   "s310000", así que buscar "310 000" o "310,000" encuentra el depa.
2. **Distrito:** el slug del chip debe ser igual al de la tarjeta.
3. **Precio máximo:** el precio de la tarjeta debe ser menor o igual.
4. **Rentabilidad mínima:** la rentabilidad mínima de la tarjeta debe ser mayor o igual.
5. Todos los criterios activos se combinan con "y".

Cómo se arman los chips (en el build, `buildFastFilters`):

- Un chip por distrito presente, en orden alfabético.
- Hasta 2 topes de precio, redondeados hacia arriba a S/ 50,000, solo si dejan fuera algún depa.
- Hasta 2 rentabilidades mínimas, solo si dejan fuera algún depa.

---

## 6. Me interesa

```mermaid
sequenceDiagram
    autonumber
    actor V as Visitante
    participant B as Botón Me interesa<br/>saved-buttons.ts
    participant ST as Mis depas<br/>saved-store.ts
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
    ST-->>DL: mismo evento: ¿pasó a 2 o más? ver flujo 7
```

Si la persona tiene el sitio abierto en otra pestaña, el evento nativo `storage` actualiza esa
pestaña también.

---

## 7. Guarda tus depas

### Cuándo aparece (UML de estados)

```mermaid
stateDiagram-v2
    [*] --> Esperando
    Esperando --> Abierto : guarda el 2.º depa y shouldPrompt()
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
menos de 7 días. El botón "Guárdalos con tu celular" de Mis depas abre el diálogo siempre.

### Envío (UML de secuencia)

```mermaid
sequenceDiagram
    autonumber
    actor V as Visitante
    participant D as Diálogo<br/>SaveListDialog + forms.ts
    participant CAT as Catálogo JSON
    participant API as depahost-api
    participant DB as PostgreSQL
    participant HD as Header

    D->>CAT: loadCatalog()
    CAT-->>D: nombres de los depas guardados
    D->>V: 2 departamentos seleccionados: Lince y Surquillo
    V->>D: nombre, celular, correo opcional, acepta privacidad
    V->>D: Guardar y continuar
    D->>D: validación nativa del navegador
    D->>API: POST /v1/leads (saved-list)
    API->>API: Turnstile, honeypot y reglas de contacto
    API->>DB: INSERT leads
    API--)API: aviso al equipo y al CRM, sin esperar
    API-->>D: 201
    D->>D: profile.set("ana lucía") guarda firstName Ana
    D-->>HD: evento profile-updated
    HD->>V: Hola, Ana
    D->>V: Listo, Ana · Ver Mis depas · Seguir viendo
```

El cuerpo del `POST` lleva `source: saved-list`, `name`, `phone`, `email` (opcional),
`propertyIds`, `consent`, `utm` y `turnstileToken`.

---

## 8. Ver el detalle de un depa

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
    V->>PG: Me interesa (flujo 6)
    V->>PG: Contactar
    PG-->>V: /capital/empecemos?depa={slug} (flujo 11)
```

Qué muestra el detalle:

- **Etiqueta:** "De propietario" o "De proyecto · Urbana", más "Reservado" o el badge.
- **Tres datos con ícono:** valor ("Precio de compra" o "Precio desde"), rentabilidad en verde
  ("Estimada") y plazo ("Plazo de inversión").
- **Características:** dormitorios, baños y m², solo si existen.
- **Bloque de aliado:** la inmobiliaria con link a sus proyectos, o "Te acompaña · DepaHost
  Capital" si es de propietario.
- **Depas similares:** los 4 más parecidos según `similarTo` (ver flujo 9).

---

## 9. Para ti, según lo que has visto

Aparece en `/capital` y, con el título "Parecidos a los que guardaste", en `/mis-depas`.

```mermaid
sequenceDiagram
    autonumber
    participant R as ForYouRow
    participant ST as Mis depas e historial
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
        RC-->>R: hasta 4 depas
        loop por cada depa
            R->>T: clona la plantilla y completa foto, título, precio, rentabilidad y plazo
        end
        R->>R: muestra la sección (u oculta si no hay resultados)
        R->>ST: se suscribe: si cambia Mis depas, recalcula
    end
```

### Cómo se calcula (UML de actividad)

```mermaid
flowchart TB
    A["Señales:<br/>guardados (peso 2)<br/>últimos 6 vistos (peso 0.5 a 1.5, más reciente pesa más)"]
    B{"¿Hay alguna señal?"}
    C["Sin recomendaciones"]
    D["Para cada depa del catálogo<br/>que NO esté guardado"]
    E["puntaje = Σ peso × similitud(señal, depa)<br/>(se salta la señal si es el mismo depa)"]
    F{"¿Ya lo vio?"}
    G["puntaje × 0.6<br/>(lo nuevo va primero)"]
    H["Descarta puntaje 0<br/>ordena de mayor a menor<br/>toma los primeros 4"]

    A --> B
    B -- no --> C
    B -- sí --> D --> E --> F
    F -- sí --> G --> H
    F -- no --> H
```

**Similitud entre dos depas** (`similarity` en `lib/recommend.ts`), de 0 a 7 puntos:

| Criterio | Puntos |
|---|---|
| Mismo distrito | 3 |
| Mismo origen (propietario o proyecto) | 1 |
| Precio cercano: `2 − 4 × diferencia relativa`, mínimo 0 | 0 a 2 |
| Rentabilidad cercana: `1 − diferencia en puntos / 3`, mínimo 0 | 0 a 1 |

Los "Depas similares" del detalle usan la misma función, pero en el build y con un solo depa
como referencia (`similarTo`).

---

## 10. Mis depas

```mermaid
sequenceDiagram
    autonumber
    actor V as Visitante
    participant P as /mis-depas
    participant ST as getSavedStore()
    participant CAT as /data/properties.json
    participant T as Plantilla SavedDepa
    participant PR as lib/profile.ts

    V->>P: abre Mis depas
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
    alt 0 guardados
        P->>V: mensaje vacío · botón deshabilitado
    else
        P->>V: "Empecemos con estos" → /capital/empecemos
    end
    V->>P: Quitar (X)
    P->>ST: remove(id) · se vuelve a pintar todo
```

La inversión total suma por moneda. Si hay depas en soles y en dólares, muestra
"S/ 595,000 + US$ 80,000".

---

## 11. Te acompañamos y WhatsApp

```mermaid
sequenceDiagram
    autonumber
    actor V as Visitante
    participant P as /capital/empecemos
    participant CAT as /data/properties.json
    participant ST as Mis depas
    participant API as depahost-api
    participant WA as WhatsApp

    V->>P: llega desde Mis depas, Capital o "Contactar"
    P->>CAT: loadCatalog()
    alt la URL trae ?depa={slug}
        P->>P: seleccionado = ese depa
    else
        P->>ST: seleccionados = Mis depas
    end
    P->>V: tarjeta(s), 3 pasos y botón de WhatsApp con el mensaje armado
    V->>P: Escribir por WhatsApp
    par
        P-)API: POST /v1/leads { source: cart, propertyIds } (sin esperar)
    and
        P->>WA: abre wa.me/{número}?text=…
    end
```

- El mensaje incluye cada depa con distrito, dirección y precio.
- Si no hay nada seleccionado, la página invita a ver depas y el mensaje de WhatsApp es genérico.
- El lead `cart` no lleva datos personales ni captcha. Si el API falla, WhatsApp se abre igual.

---

## 12. Formularios

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

### Los formularios

| Formulario | Página | Payload | Al terminar |
|---|---|---|---|
| Inglés | `/capital` | `source: intl-form`, `locale: en`, `name`, `email`, `amountUsd` | "Thanks!" + link de WhatsApp en inglés |
| Propietarios | `/propietarios` | `owner-sell` si "Vender"; `owner-rent` si "Alquilar" o "Airbnb"; `details: { district, propertyType, intent, expectedPrice }` | "Te escribimos por WhatsApp" + link |
| Guarda tus depas | Diálogo global | `saved-list` + `propertyIds` | Saludo y paso "Listo" (flujo 7) |
| Libro de Reclamaciones | `/libro-de-reclamaciones` | `consumer`, `item`, `kind`, `detail`, `request`, `consent` | Constancia en pantalla e imprimible |

En Propietarios, los botones "Quiero vender" y "Poner en alquiler" eligen la opción del select y
llevan el foco al nombre. Las URLs `/propietarios#vender` y `#alquiler` también la preseleccionan.
Si eligen alquiler o Airbnb, el campo de precio pasa a "Alquiler mensual esperado".

### Libro de Reclamaciones (UML de secuencia)

```mermaid
sequenceDiagram
    autonumber
    actor C as Consumidor
    participant F as Formulario
    participant API as depahost-api
    participant TS as Turnstile
    participant DB as PostgreSQL
    participant M as Resend

    C->>F: completa datos, bien contratado, detalle y pedido
    opt es menor de edad
        F->>C: pide nombre del padre, madre o apoderado
    end
    C->>F: Enviar reclamo
    F->>API: POST /v1/complaints
    API->>TS: verifica el token
    TS-->>API: ok
    API->>DB: BEGIN · nextval('complaint_seq')
    API->>DB: INSERT complaints con código LR-2026-00000N y plazo de 15 días hábiles
    API->>DB: COMMIT
    API-)M: constancia al consumidor y al equipo (sin esperar)
    API-->>F: 201 { code, createdAt, responseDeadline }
    F->>C: "Recibimos tu reclamo" · código · fecha límite · Imprimir
```

### Estados de un reclamo

```mermaid
stateDiagram-v2
    [*] --> pending : POST /v1/complaints
    pending --> answered : POST /v1/admin/complaints/{id}/response
    answered --> answered : se puede volver a responder
    note right of pending
        response_deadline = fecha de Lima + 15 días hábiles
        (sábados y domingos no cuentan)
    end note
    note right of answered
        Se guarda responded_at y se envía
        la respuesta por correo al consumidor
    end note
```

---

## 13. Cambiar el contrato del API

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Desarrollador
    participant API as Repo depahost-api
    participant FE as Repo depahostcapital
    participant TS as TypeScript

    Dev->>API: cambia un esquema Zod (por ejemplo, agrega un campo)
    opt cambia la base de datos
        Dev->>API: edita db/schema.ts y corre pnpm db:generate
    end
    Dev->>API: pnpm test · pnpm openapi:export
    API->>API: escribe openapi.json
    Note over API: la CI falla si openapi.json no se regeneró
    Dev->>FE: pnpm api:sync
    FE->>API: copia ../depahost-api/openapi.json (o OPENAPI_URL)
    FE->>FE: openapi-typescript genera src/lib/api/schema.d.ts
    Dev->>FE: pnpm check
    TS-->>Dev: errores donde el sitio usa algo que cambió
    Dev->>FE: ajusta content.config.ts, loaders y componentes
```

---

## 14. Cookies y analítica

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

## 15. Qué pasa cuando algo falla

| Situación | Qué pasa | Qué ve la persona |
|---|---|---|
| El API no responde durante el build | El build falla y el hosting mantiene la versión anterior | Nada cambia |
| El API cambió de forma | El esquema de `content.config.ts` rechaza los datos y el build falla | Nada cambia |
| `PUBLIC_API_URL` vacío | Los formularios no envían y ofrecen WhatsApp | "Por ahora recibimos estas consultas por WhatsApp" |
| El API cae mientras alguien llena un formulario | Error de red | Mensaje de error + link de WhatsApp con su mensaje |
| Envía demasiadas veces | 429 | "Espera un minuto" |
| Un campo no pasa la validación del API | 400 con `issues` | El campo se marca con el mensaje del API |
| Falla Turnstile | 400 | "No pudimos verificar que no eres un robot…" |
| No carga `/data/properties.json` | Mis depas muestra un aviso; Para ti queda oculta | "No pudimos cargar tus depas guardados" |
| Un depa guardado ya no existe | Se quita solo de Mis depas | No aparece |
| `localStorage` bloqueado | Las listas funcionan en memoria en esa página | Mis depas se vacía al recargar |
| Falla el correo o el CRM | El lead o reclamo ya quedó guardado; se registra en el log | Nada |
| Falla el deploy hook | Se registra en el log | El cambio no aparece hasta el próximo build |
