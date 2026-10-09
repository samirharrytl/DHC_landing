# Documentación del CSS de Depa Host Perú

> Explicación línea por línea de todo el CSS del proyecto, para entender qué hace
> cada regla y por qué está escrita así.
>
> Fecha de revisión: 2026-10-08 · Astro 7 · Sin Tailwind (CSS puro + tokens)

---

## 0. Cómo está organizado el CSS (la arquitectura)

El proyecto separa el CSS en 3 capas, que es la forma idiomática de trabajar en Astro:

```
src/styles/tokens.css   → variables (design tokens): colores, espacios, tipos, radios…
src/styles/global.css   → reset + base + utilidades + botones (compartido por todo)
cada .astro             → <style> "scoped": estilos de ese componente/página nada más
```

**¿Qué significa "scoped"?** Astro procesa cada `<style>` de un componente y le añade un
hash único a los selectores (ej. `.card-abc123`). Así, un `.card` en `PropertyCard.astro`
nunca se mezcla con un `.card` de otro archivo. Solo escapas a ese aislamiento con
`:global(...)`, que se usa muy poco y a propósito.

**¿Cómo se sirve?** En `astro.config.mjs` hay `build.inlineStylesheets: 'always'`, que
mete TODO el CSS dentro del HTML de cada página. Ventaja: una petición HTTP menos.
Desventaja: el navegador no puede cachear el CSS entre páginas. Para un sitio tan chico
está bien; si el CSS crece mucho, conviene cambiar a `'auto'`.

Los tokens (`tokens.css`) y los globales (`global.css`) se importan **una sola vez** en
`BaseLayout.astro` (todas las páginas lo heredan).

---

## 1. `src/styles/tokens.css` — Design tokens

Es el "diccionario" de valores reutilizables. Todo lo demás usa `var(--lo-que-sea)`.

### Colores de marca (`--color-navy-*`)
```css
--color-navy-900: #031A39;   /* footer / banda CTA (el azul casi negro) */
--color-navy-800: #012147;   /* primario: botones, chips, stepper */
--color-navy-850: #00152F;   /* hover del primario */
--color-navy-950: #000F22;   /* active (al presionar) del primario */
--color-navy-50:  #F0F3F8;   /* fondo suave / hover de botón con borde */
--color-navy-100: #E1E7F0;   /* active de botón con borde */
```
> Los números (900, 800, 50, 100) siguen la convención de "escala de tonalidades":
> cuanto más alto, más oscuro. 50/100 son claritos, 800/900/950 oscuros.

### Colores de WhatsApp (`--color-wa-*`)
```css
--color-wa-700: #094835;   /* fondo del botón de WhatsApp (verde oscuro) */
--color-wa-800: #063626;   /* hover */
--color-wa-900: #04281C;   /* active */
--color-wa-500: #25D366;   /* verde oficial, SOLO para el ícono */
```
> El verde del botón NO es el verde oficial de WhatsApp (que es `#25D366`): es un verde
> oscuro que da mejor contraste con texto blanco. El verde oficial queda reservado al ícono.

### Colores de texto
```css
--color-text-strong: #0A1128;  /* títulos (casi negro azulado) */
--color-text:        #2B2B2B;  /* cuerpo */
--color-text-muted:  #5C5C5C;  /* secundario: direcciones, labels, subtítulos */
--color-text-inverse: #FFFFFF; /* texto sobre fondos oscuros */
--color-text-inverse-muted: #B8C4D6; /* subtítulos sobre navy */
```

### Superficies y bordes
```css
--color-bg:          #FFFFFF;  /* fondo de la página */
--color-surface:     #FFFFFF;  /* fondo de tarjetas */
--color-surface-alt: #FBFBFB;  /* barra del formulario en inglés */
--color-border:        #DBDBDB; /* borde de tarjetas */
--color-border-subtle: #E4E4E4; /* divisores internos finos */
--color-border-input:  #8A8F98; /* borde de inputs (contraste AA) */
--color-border-strong: var(--color-navy-800); /* bordes que resaltan */
```

### Estados
```css
--color-focus:   #2563EB;  /* azul del anillo de foco (contraste AA) */
--color-error:   #B42318;
--color-success: #0F7B4A;
--color-disabled-bg:   #E5E7EB;
--color-disabled-text: #6B7280;
--color-overlay: rgb(3 26 57 / 0.5); /* velo oscuro del menú móvil (50% de opacidad) */
```

### Tipografía
```css
--font-sans: var(--font-inter, ui-sans-serif, system-ui, …);
```
> `--font-inter` la genera Astro (ver `astro.config.mjs` → `fonts`). Si por algo no
> existe, caen las fuentes del sistema. Es una cadena de "fallback".

```css
--fw-regular: 400; --fw-medium: 500; --fw-semibold: 600; --fw-bold: 700;  /* pesos */
```

**Escala fluida** (con `clamp(min, ideal, max)` crece/encoge con el ancho de pantalla):
```css
--fs-display: clamp(2rem, 1.25rem + 2.5vw, 3.25rem);  /* 32→52  H1 hero */
--fs-h2:      clamp(1.5rem, 1.1rem + 1.6vw, 2.25rem);  /* 24→36  títulos sección */
--fs-h3:      clamp(1.125rem, 1rem + 0.5vw, 1.375rem); /* 18→22  títulos tarjeta */
--fs-lead:    clamp(1.0625rem, 1rem + 0.3vw, 1.25rem); /* 17→20  subtítulo hero */
--fs-body:    1rem;      /* 16 */
--fs-sm:      0.875rem;  /* 14 */
--fs-xs:      0.75rem;   /* 12 (mínimo absoluto) */
--fs-stat:    clamp(1rem, 0.95rem + 0.25vw, 1.125rem); /* 16→18 valores de tarjeta */
```
> `clamp(MIN, IDEAL, MAX)`: el navegador usa `IDEAL`, pero nunca baja de `MIN` ni sube de `MAX`.

```css
--lh-tight: 1.1;    /* line-height de los títulos grandes */
--lh-heading: 1.25; /* line-height de h2/h3 */
--lh-body: 1.5;     /* line-height del texto normal */
--ls-tight: -0.02em; /* letter-spacing negativo (títulos, más compactos) */
--ls-caps: 0.04em;   /* letter-spacing para texto en MAYÚSCULAS */
```

### Espaciado (base 4px)
```css
--space-1: 0.25rem;  /* 4  */
--space-2: 0.5rem;   /* 8  */
--space-3: 0.75rem;  /* 12 */
--space-4: 1rem;     /* 16 */
--space-5: 1.25rem;  /* 20 */
--space-6: 1.5rem;   /* 24 */
--space-8: 2rem;     /* 32 */
--space-10: 2.5rem;  /* 40 */
--space-12: 3rem;    /* 48 */
--space-16: 4rem;    /* 64 */
--space-20: 5rem;    /* 80 */
--space-24: 6rem;    /* 96 */
--section-y: clamp(3rem, 2rem + 4vw, 6rem); /* 48→96 padding vertical de sección */
```
> Son múltiplos de 4 px. No están todos los números (falta el 7=28, 9=36…): solo se
> definen los que el proyecto usa de verdad.

### Layout
```css
--container-max: 75rem; /* 1200 px: ancho máximo del contenido */
--gutter: 1rem;         /* 16 px: margen lateral en móvil */
--grid-gap: 1rem;       /* 16 px entre tarjetas (móvil) */
--header-h: 4rem;       /* 64 px alto del header (móvil) */
```

### Radios y bordes
```css
--radius-sm: 4px;      /* chips */
--radius-md: 8px;      /* botones, inputs */
--radius-lg: 12px;     /* tarjetas, dropdown */
--radius-pill: 999px;  /* stepper, FAB (círculo perfecto) */
--border-width: 1px;
--border-width-strong: 1.5px;
--border: var(--border-width) solid var(--color-border);            /* atajo */
--border-subtle: var(--border-width) solid var(--color-border-subtle); /* atajo */
```
> `--border` y `--border-subtle` son atajos: en vez de escribir `border: 1px solid #DBDBDB`,
> se escribe `border: var(--border)`.

### Sombras
```css
--shadow-sm: 0 1px 2px rgb(3 26 57 / 0.06);
--shadow-md: 0 1px 2px rgb(3 26 57 / 0.06), 0 4px 12px rgb(3 26 57 / 0.08);
--shadow-lg: 0 8px 24px rgb(3 26 57 / 0.12);
--shadow-dropdown: 0 12px 32px rgb(3 26 57 / 0.16);
--shadow-header: 0 1px 0 var(--color-border-subtle), 0 4px 12px rgb(3 26 57 / 0.06);
--focus-ring: 0 0 0 2px #FFFFFF, 0 0 0 4px var(--color-focus);
```
> Formato de `box-shadow`: `desplazamientoX desplazamientoY desenfoque color`.
> El `--focus-ring` usa DOS sombras: un anillo blanco (separa del fondo) + un anillo azul.
> `rgb(3 26 57 / 0.06)` = color navy al 6% de opacidad (sintaxis moderna, sin `rgba()`).

### Controles y movimiento
```css
--control-h-sm: 2.75rem; /* 44 px: alto mínimo táctil recomendado (Apple/Google) */
--control-h-md: 3rem;    /* 48 px */
--control-h-lg: 3.25rem; /* 52 px */
--icon-sm: 1.25rem;      /* 20 px */
--icon-md: 1.5rem;       /* 24 px */
--dur-fast: 120ms; --dur-base: 200ms; --dur-slow: 280ms; /* duraciones de animación */
--ease-out: cubic-bezier(0.2, 0.8, 0.2, 1); /* curva de easing (empieza rápido, frena) */
```

### Z-index
```css
--z-base: 0; --z-raised: 10; --z-header: 100; --z-dropdown: 200;
--z-fab: 250; --z-overlay: 300; --z-drawer: 310; --z-toast: 400;
```
> Centralizar el z-index evita el caos de números sueltos. El orden importa: el drawer
> (310) va encima del overlay (300), etc.

### Media queries de tokens (ajustan variables según pantalla)
```css
@media (min-width: 640px) {
  :root { --gutter: 1.5rem; --header-h: 4.5rem; }
}
@media (min-width: 1024px) {
  :root { --gutter: 2rem; --grid-gap: 1.5rem; --header-h: 5rem; }
}
```
> Al cambiar el valor de la variable dentro de `:root`, TODO el sitio que use
> `var(--gutter)` se ajusta solo, sin tocar cada regla.

```css
@media (prefers-reduced-motion: reduce) {
  :root { --dur-fast: 0ms; --dur-base: 0ms; --dur-slow: 0ms; }
}
```
> Si el usuario pidió "reducir movimiento" en su sistema operativo, todas las
> animaciones duran 0 ms (se vuelven instantáneas). Accesibilidad.

---

## 2. `src/styles/global.css` — Reset, base y utilidades

### Reset básico
```css
*, *::before, *::after { box-sizing: border-box; }
```
> Hace que `padding` y `border` se cuenten DENTRO del ancho/alto. Sin esto, un elemento
> con `width: 100px; padding: 10px` mediría 120px. Es el reset estándar moderno.

```css
html { -webkit-text-size-adjust: 100%; }
```
> Evita que Safari/iOS agrande el texto al girar el teléfono a horizontal.

```css
@media (prefers-reduced-motion: no-preference) {
  html { scroll-behavior: smooth; }
}
```
> Scroll suave al saltar a un `#ancla`, pero solo si el usuario no pidió reducir movimiento.

### Body
```css
body {
  margin: 0;                              /* quita el margen por defecto del navegador */
  font-family: var(--font-sans);          /* Inter (o fallback del sistema) */
  font-size: var(--fs-body);              /* 16px */
  line-height: var(--lh-body);            /* 1.5 */
  color: var(--color-text);               /* #2B2B2B */
  background: var(--color-bg);            /* blanco */
}
```

```css
img { display: block; max-width: 100%; height: auto; }
```
> Las imágenes no se desbordan de su contenedor (`max-width:100%`), mantienen proporción
> (`height:auto`) y dejan de ser "inline" (quita el hueco fantasma debajo de un `<img>`).

```css
button, input { font: inherit; }
```
> Botones e inputs NO heredan la fuente por defecto en el navegador; esta línea los obliga
> a usar la fuente del sitio. *(Mejora: agregar `select` y `textarea`.)*

### Encabezados
```css
h1, h2, h3 {
  margin: 0;                          /* quita el margen por defecto (luego cada sección decide) */
  color: var(--color-text-strong);
  line-height: var(--lh-heading);
  text-wrap: balance;                 /* reparte las palabras para evitar líneas muy disparejas */
}
h1 { font-size: var(--fs-display); line-height: var(--lh-tight); letter-spacing: var(--ls-tight); font-weight: var(--fw-bold); }
h2 { font-size: var(--fs-h2); letter-spacing: var(--ls-tight); font-weight: var(--fw-bold); }
h3 { font-size: var(--fs-h3); font-weight: var(--fw-bold); }
```
> `text-wrap: balance` es CSS moderno: equilibra el ancho de las líneas de un título.

### Foco accesible
```css
:focus-visible { outline: none; box-shadow: var(--focus-ring); }
```
> `:focus-visible` solo dispara cuando navegas con TECLADO (Tab), no con mouse.
> Reemplaza el outline por defecto con el anillo blanco+azul de `--focus-ring`.

```css
[id] { scroll-margin-top: calc(var(--header-h) + var(--space-4)); }
```
> Al saltar a `#ancla`, el header fijo (sticky) no tapa el título: deja un margen arriba
> igual al alto del header + 16px.

```css
html.menu-open { overflow: hidden; }
```
> Cuando el menú móvil está abierto, bloquea el scroll de la página de fondo.

### Layout
```css
.container {
  width: min(100% - 2 * var(--gutter), var(--container-max));
  margin-inline: auto;
}
```
> El patrón de "contenedor centrado": ancho = el menor entre (pantalla − 2 márgenes) y el
> máximo de 1200px. `margin-inline: auto` lo centra. `min()` es CSS moderno.

```css
.section { padding-block: var(--section-y); }
```
> Padding vertical grande para separar secciones (usado en páginas placeholder).

### Subtítulo y nota legal
```css
.lead { margin: var(--space-3) 0 0; font-size: var(--fs-lead); color: var(--color-text-muted); }
```
> El "lead": subtítulo grande gris debajo de un h1/h2.

```css
.disclaimer {
  margin: var(--space-4) 0 0;
  max-width: 70ch;        /* ancho ideal de lectura: 70 caracteres aprox. */
  font-size: 0.8125rem;  /* 13px */
  color: var(--color-text-muted);
}
```
> `ch` es el ancho del carácter "0"; `70ch` limita la línea para que sea cómoda de leer.

### Botones (`.btn` y variantes)
```css
.btn {
  --btn-h: var(--control-h-md);     /* variable local: alto del botón (48px) */
  display: inline-flex;             /* para centrar ícono + texto */
  align-items: center;
  justify-content: center;
  gap: var(--space-2);              /* espacio entre ícono y texto */
  min-height: var(--btn-h);
  min-width: var(--control-h-sm);   /* ancho mínimo 44px */
  padding: 0 var(--space-6);        /* sin padding vertical (el alto lo da min-height) */
  border: var(--border-width-strong) solid transparent; /* borde invisible: reserva espacio */
  border-radius: var(--radius-md);
  font: var(--fw-semibold) var(--fs-body) / 1 var(--font-sans); /* shorthand: peso tamaño/line-height familia */
  text-decoration: none;
  white-space: nowrap;              /* el texto del botón no se parte en dos líneas */
  cursor: pointer;
  transition: background-color var(--dur-fast) var(--ease-out),
              border-color var(--dur-fast) var(--ease-out),
              color var(--dur-fast) var(--ease-out),
              transform var(--dur-fast) var(--ease-out);
}
```
> `border transparent` es un truco: si cambias de variante (con/sin borde), el botón no
> "salta" de tamaño, porque el borde ya ocupa su lugar.

```css
.btn svg { width: var(--icon-sm); height: var(--icon-sm); flex: none; }
.btn:active { transform: translateY(1px); }   /* efecto "presionar": baja 1px */
```

**Tamaños y variantes**
```css
.btn--sm { --btn-h: var(--control-h-sm); padding: 0 var(--space-4); font-size: 0.9375rem; }
```
> Al cambiar `--btn-h`, hereda el `min-height` de `.btn`. Variable local bien aprovechada.

```css
.btn--block { width: 100%; }              /* botón a ancho completo */
.btn--primary { background: var(--color-navy-800); color: var(--color-text-inverse); }
.btn--primary:hover { background: var(--color-navy-850); }
.btn--primary:active { background: var(--color-navy-950); }
.btn--secondary { background: transparent; color: var(--color-navy-800); border-color: var(--color-navy-800); }
.btn--secondary:hover { background: var(--color-navy-50); }
.btn--secondary:active { background: var(--color-navy-100); }
.btn--whatsapp { background: var(--color-wa-700); color: var(--color-text-inverse); }
.btn--whatsapp:hover { background: var(--color-wa-800); }
.btn--whatsapp:active { background: var(--color-wa-900); }
```
> Convención: `hover` un tono más oscuro, `active` (presionando) aún más oscuro.

### Grupo de botones
```css
.btn-group { display: flex; flex-direction: column; gap: var(--space-3); }
.btn-group > .btn { width: 100%; }
@media (min-width: 640px) {
  .btn-group { flex-direction: row; flex-wrap: wrap; }
  .btn-group > .btn { width: auto; }
}
```
> Móvil: botones apilados y a ancho completo. Desde 640px: en fila y tamaño natural.

### Utilidades
```css
.sr-only { … }   /* "solo lectores de pantalla": oculta visualmente sin quitar del DOM */
```
> El patrón `.sr-only` posiciona el elemento fuera de la vista con `clip` y tamaño 1px,
> pero sigue disponible para el lector de pantalla (screen reader). Es el estándar de a11y.

```css
.skip-link { position: absolute; top: -100px; left: var(--space-4); z-index: var(--z-toast); … }
.skip-link:focus { top: var(--space-4); }
```
> "Saltar al contenido": invisible hasta que llega el foco con Tab; entonces aparece.

```css
@media (prefers-reduced-motion: reduce) { .btn:active { transform: none; } }
```
> Desactiva el efecto "presionar" para quien pidió reducir movimiento.

---

## 3. Estilos de componentes y páginas (scoped)

### `BaseLayout.astro` (solo 2 reglas)
```css
.scroll-sentinel {
  position: absolute; top: 0; left: 0;
  width: 1px; height: 8px;   /* marca invisible de 8px arriba del todo */
  pointer-events: none;      /* no intercepta clics */
}
```
> Sirve como "sensor de scroll" (ver JS del Header): cuando esta marquita deja de verse,
> significa que bajaste más de 8px y el header muestra su sombra.

```css
main { padding-bottom: var(--space-16); }          /* en móvil */
@media (min-width: 640px) { main { padding-bottom: 0; } }
```
> En móvil hay un botón flotante de WhatsApp abajo; este padding evita que tape el último
> contenido. *(Depende del alto del FAB: 56px ≈ 3.5rem, por eso 4rem.)*

### `Header.astro`

**Barra**
```css
.header { position: sticky; top: 0; z-index: var(--z-header); background: #fff; transition: box-shadow …; }
```
> `position: sticky` fija el header arriba al hacer scroll, pero sigue ocupando su lugar.

```css
.header.is-scrolled { box-shadow: var(--shadow-header); }
```
> La clase `is-scrolled` la agrega el JS con IntersectionObserver.

```css
.bar { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); min-height: var(--header-h); }
```
> Logo a la izquierda, menú/acciones a la derecha, centrados verticalmente.

**Menú de escritorio**
```css
.nav { display: none; }                    /* oculto por defecto (móvil) */
.nav ul { display: flex; gap: var(--space-6); margin: 0; padding: 0; list-style: none; }
.nav a { … min-height: var(--control-h-sm); }  /* cada link tiene área táctil de 44px */
```
**Estado activo** (página actual)
```css
.nav a[aria-current='page'] { color: navy; font-weight: semibold; text-decoration: underline;
  text-decoration-thickness: 2px; text-underline-offset: 8px; }
```
> Usa el atributo `aria-current` (que el header ya pone en el link activo) para subrayarlo.
> `text-underline-offset` separa la línea del texto.

**Acciones**
```css
.lang-wrap { display: none; }   /* ES|EN oculto en móvil */
.wa { display: none; }          /* botón WhatsApp oculto en móvil */
```
```css
.burger { … width/height: var(--control-h-sm); border: 0; background: transparent; }
.burger:hover { background: var(--color-navy-50); }
```
**Tablet (≥640px)**
```css
.lang-wrap { display: block; }
.wa { display: inline-flex; width: var(--control-h-sm); padding: 0; }  /* solo ícono */
```
**Escritorio (≥1024px)**
```css
.nav { display: block; }
.wa { width: auto; padding: 0 var(--space-4); }   /* WhatsApp con texto */
.wa-label { position: static; width: auto; height: auto; margin: 0; overflow: visible; clip: auto; }
.actions .burger { display: none; }
```
> `.wa-label` deshace el `.sr-only`: en escritorio el texto "WhatsApp" se ve; en tablet solo
> el ícono. Es un truco elegante de "mostrar/ocultar" reutilizando la misma utilidad.
```css
@media (min-width: 1280px) { .nav ul { gap: var(--space-8); } }  /* más aire en pantallas grandes */
```

**Drawer (menú móvil)**
```css
.drawer {
  position: fixed; inset: 0 0 0 auto;   /* pegado a la derecha, alto completo */
  width: min(320px, 85vw); max-width: none;
  height: 100dvh; max-height: none;     /* 100dvh = alto real del viewport móvil */
  margin: 0; padding: 0; border: 0; background: #fff;
}
```
> El `<dialog>` del navegador se centra por defecto con `margin:auto` y tiene `max-width`;
> aquí se "des-centra" para convertirlo en panel lateral. `dvh` es "dynamic viewport height"
> (respeta la barra del navegador móvil que aparece/desaparece).

```css
.drawer::backdrop { background: var(--color-overlay); }
```
> `::backdrop` es el fondo oscuro que cubre la página cuando el `<dialog>` está abierto.

```css
.drawer[open] { animation: drawer-in var(--dur-slow) var(--ease-out); }
@keyframes drawer-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
```
> Animación de entrada: el panel entra deslizándose desde la derecha (100% → 0).

```css
.drawer-panel { display: flex; flex-direction: column; height: 100%; padding: var(--space-4); overflow-y: auto; }
.drawer-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-4); }
.drawer-links li + li { border-top: var(--border-subtle); }   /* línea entre opciones */
.drawer-links a { display: flex; align-items: center; min-height: var(--control-h-md); font-size: 1.125rem; }
.drawer-bottom { … margin-top: auto; }  /* empuja el bloque de abajo hasta el fondo */
```
> `li + li` selecciona todos los `<li>` EXCEPTO el primero (para no dibujar línea arriba).
> `margin-top: auto` en un flex-column empuja el contenido hacia abajo (truco de flexbox).

**FAB (botón flotante de WhatsApp)**
```css
.fab {
  position: fixed; right: var(--space-4);
  bottom: calc(var(--space-4) + env(safe-area-inset-bottom));  /* respeta el "notch" del iPhone */
  z-index: var(--z-fab);
  width: 56px; height: 56px; border-radius: var(--radius-pill);
  background: var(--color-wa-700); color: #fff; box-shadow: var(--shadow-lg);
  opacity: 0; visibility: hidden; transform: translateY(8px);   /* estado oculto */
  transition: opacity …, transform …, visibility …;
}
```
> `env(safe-area-inset-bottom)` es el margen que deja el iPhone para no tapar la barra de
> inicio. La transición de `visibility` permite que el fade-out espere a que termine el fade.

```css
.fab.is-visible { opacity: 1; visibility: visible; transform: none; }
:global(html.menu-open) .fab { display: none; }   /* se esconde con el menú abierto */
@media (min-width: 640px) { .fab { display: none; } }  /* en desktop no hay FAB */
```
> `:global(html.menu-open)` escapa del scoping porque `html.menu-open` es una clase del
> `<html>`, fuera del componente.

### `Footer.astro`
```css
.footer { background: var(--color-navy-900); color: #fff; }
.band { padding-block: var(--space-8); }
.band-inner { display: flex; flex-direction: column; align-items: center; gap: var(--space-4); text-align: center; }
.band-inner :global(.band-btn) { width: 100%; }
```
> `:global(.band-btn)` porque `.band-btn` es la clase que pasa el `<Button>` (componente
> externo), cuyo hash Astro no conoce.

**Escritorio**
```css
@media (min-width: 1024px) {
  .band { … min-height: 96px; display: flex; align-items: center; }
  .band-inner { display: grid; grid-template-columns: auto 1fr auto; gap: var(--space-8); }
}
```
> Layout de 3 columnas: logo | texto | botón.

**Fila legal**
```css
.legal { border-top: 1px solid rgb(255 255 255 / 0.12); … color: var(--color-text-inverse-muted); }
```
> Línea divisoria blanca semitransparente (12% de opacidad) sobre fondo navy.
```css
.legal a { min-height: var(--control-h-sm); }  /* área táctil 44px en móvil */
@media (min-width: 1024px) {
  .legal-inner { flex-direction: row; justify-content: space-between; }
  .legal ul { flex-direction: row; gap: var(--space-6); }
}
```

### `Logo.astro`
```css
.logo { display: inline-flex; align-items: center; gap: var(--space-2); min-height: var(--control-h-sm); … }
.logo.inverse { color: #fff; }          /* versión blanca para el footer navy */
svg { width: 32px; height: 32px; flex: none; }
@media (min-width: 640px)  { svg { width: 36px; height: 36px; } }
@media (min-width: 1024px) { svg { width: 44px; height: 44px; } .logo { font-size: 1.25rem; } }
```
> El ícono crece con la pantalla (32→36→44). `flex: none` evita que se aplaste.

### `LangSwitch.astro`
```css
.lang { display: flex; align-items: center; font-size: var(--fs-sm); … }
a, span[lang] { min-width: var(--control-h-sm); min-height: var(--control-h-sm); }
a { color: var(--color-text-strong); text-decoration: none; }
span[lang] { cursor: not-allowed; }     /* "EN" no es clicable todavía */
```
> Área táctil de 44×44 para cada idioma.

### `OwnerDropdown.astro` (menú "Soy propietario")
```css
.owner { position: relative; width: 100%; }
.owner-btn { width: 100%; }
.chevron { transition: transform var(--dur-base) var(--ease-out); }
.owner-btn[aria-expanded='true'] .chevron { transform: rotate(180deg); }
```
> La flechita gira 180° cuando el menú está abierto, usando el atributo `aria-expanded`
> que el JS actualiza.

```css
.owner-menu { margin: …; padding: var(--space-1); list-style: none; background: #fff; border: var(--border); border-radius: var(--radius-lg); }
.owner-menu[hidden] { display: none; }
```
> `[hidden]{display:none}` es un refuerzo: garantiza que el atributo `hidden` siempre
> funcione, aunque otra regla ponga `display` en el `ul`.

```css
.owner-menu a { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); min-height: var(--control-h-md); … }
.owner-menu a:hover { background: var(--color-navy-50); }
```
**Escritorio (≥640px)**
```css
.owner { width: auto; } .owner-btn { width: auto; }
.owner-menu {
  position: absolute; top: calc(100% + var(--space-2)); left: 0;  /* flota debajo del botón */
  z-index: var(--z-dropdown); min-width: max(100%, 260px);
  margin: 0; white-space: nowrap; box-shadow: var(--shadow-dropdown);
}
```
> `max(100%, 260px)`: el menú mide al menos lo que el botón, y como mínimo 260px.

### `Step.astro` (pasos de "Cómo funciona")
```css
.step { position: relative; display: grid; grid-template-columns: 32px 1fr; gap: var(--space-4); padding-bottom: var(--space-6); }
```
> Móvil: círculo (32px) a la izquierda, texto a la derecha.

```css
.step::before {
  content: ''; position: absolute; top: 32px; bottom: 0; left: 15px;
  width: 2px; background: var(--color-border);
}
.step:last-child::before { display: none; }
```
> `::before` dibuja la línea vertical que une los círculos. `left: 15px` la centra bajo el
> círculo de 32px (32/2 − 1px de la línea = 15px). El último paso no dibuja línea.

```css
.number { position: relative; … width: 32px; height: 32px; border-radius: var(--radius-pill); background: var(--color-navy-800); color: #fff; }
```
> `position: relative` para que el círculo quede ENCIMA de la línea (`::before` es absoluto).

**Escritorio (≥640px)**
```css
.step { display: flex; flex-direction: column; align-items: center; text-align: center; … }
.step::before { top: 19px; bottom: auto; left: 50%; width: 100%; height: 2px; }
```
> La línea pasa a horizontal, centrada bajo los círculos (de 40px → top: 40/2−1 = 19px).
> `left: 50%` sin `transform` se usa para que la línea recorra todo el ancho entre pasos.
```css
.number { width: 40px; height: 40px; }
p { max-width: 18ch; margin-inline: auto; }   /* limita el ancho del texto del paso */
```

### `PropertyCard.astro` (tarjeta de depa)
```css
.card { position: relative; display: flex; flex-direction: column; background: var(--color-surface);
  border: var(--border); border-radius: var(--radius-lg); overflow: hidden; container-type: inline-size;
  transition: box-shadow …, transform …; }
```
> `container-type: inline-size` convierte la tarjeta en un "query container": permite usar
> `@container` para reaccionar a SU propio ancho (no al de la ventana).
```css
.card:hover { box-shadow: var(--shadow-lg); transform: translateY(-2px); }  /* se eleva */
.card:has(a:focus-visible) { box-shadow: var(--focus-ring); }  /* anillo si el link tiene foco */
```
> `:has()` es el "parent selector": estiliza la tarjeta cuando su link interno tiene foco.

**Media (imagen 16:9)**
```css
.media { position: relative; aspect-ratio: 16 / 9; overflow: hidden; background: var(--color-border-subtle); }
.media img { width: 100%; height: 100%; object-fit: cover; transition: transform …; }
.card:hover .media img { transform: scale(1.03); }   /* zoom sutil al pasar el mouse */
```
> `aspect-ratio` reserva el espacio 16:9 sin importar el contenido. `object-fit: cover`
> recorta la foto para llenar el marco sin deformarla.

```css
.placeholder { display: grid; place-items: center; height: 100%; background: linear-gradient(135deg, navy-50, navy-100); }
.placeholder :global(svg) { width: 48px; height: 48px; opacity: 0.35; }
```
> El bloque con casita que se muestra mientras no hay foto. `:global` porque el `svg` viene
> del componente `HouseIcon`.

```css
.tag { position: absolute; top: var(--space-3); left: var(--space-3); … background: var(--color-navy-800);
  font-size: var(--fs-xs); text-transform: uppercase; letter-spacing: var(--ls-caps); }
```
> El "badge" (ej. "SÚPER PRECIO") flota sobre la foto, arriba a la izquierda.

**Cuerpo**
```css
.body { display: flex; flex-direction: column; gap: var(--space-1); flex: 1; padding: var(--space-4); }
.title a::after { content: ''; position: absolute; inset: 0; }  /* link que cubre toda la tarjeta */
.title a:focus-visible { box-shadow: none; }
```
> Truco clásico de "tarjeta clicable": el `::after` invisible del link se expande a TODA la
> tarjeta, así se puede hacer clic en cualquier parte. Por eso se quita el anillo de foco
> del link (el anillo se dibuja en `.card:has(a:focus-visible)` en su lugar).

**Estadísticas**
```css
.stats { display: grid; grid-template-columns: repeat(3, 1fr); margin: var(--space-4) 0 0; }
.stat + .stat { border-left: var(--border-subtle); padding-left: var(--space-3); }
dd { … font-variant-numeric: tabular-nums; white-space: nowrap; }
```
> 3 columnas iguales (valor / cuota / renta) separadas por líneas. `tabular-nums` hace que
> todos los números tengan el mismo ancho (para que no "bailen").

```css
@container (max-width: 300px) { dd { font-size: 0.9375rem; } }
```
> Container query: si la TARJETA (no la pantalla) es más angosta que 300px, achica los
> números. Útil en el carrusel móvil donde una tarjeta puede quedar muy estrecha.

**"Se paga sola"**
```css
.footer { display: flex; align-items: center; justify-content: center; gap: var(--space-2);
  border-top: var(--border-subtle); color: var(--color-success); }
```

### `PropertyGrid.astro` (contenedor de tarjetas)
```css
.property-grid {
  display: grid; gap: var(--grid-gap);
  grid-auto-flow: column; grid-auto-columns: 85%;   /* carrusel horizontal en móvil */
  overflow-x: auto; scroll-snap-type: x mandatory;  /* "snap": cada tarjeta se acomoda */
  overscroll-behavior-x: contain;                   /* el scroll no "salta" a la página */
  margin-inline: calc(-1 * var(--gutter));          /* el carrusel llega al borde */
  padding-inline: var(--gutter);
  scroll-padding-inline: var(--gutter);
}
.property-grid > :global(*) { scroll-snap-align: start; }
```
> En móvil las tarjetas forman un carrusel que se desliza con el dedo y "encaja" (snap).
> El margen negativo + padding compensado deja que las tarjetas sangren hasta el borde.

```css
@media (min-width: 640px)  { .property-grid { grid-auto-flow: row; grid-template-columns: repeat(2, 1fr); overflow: visible; … } }
@media (min-width: 1024px) { .property-grid { grid-template-columns: repeat(3, 1fr); } }
```
> Tablet: 2 columnas. Escritorio: 3 columnas. Se quita el scroll porque ya caben.

### `index.astro` (home)

**Hero**
```css
.hero { display: flex; flex-direction: column; }        /* móvil: texto arriba, imagen abajo */
.hero-media { order: 2; aspect-ratio: 4 / 3; background: linear-gradient(120deg, navy-50, navy-100 60%, #c9d4e5); }
.hero-media :global(svg) { width: 30%; max-width: 220px; opacity: 0.25; }
```
> Móvil: el hero muestra primero el texto (`order:1` por defecto) y luego la imagen
> placeholder con degradado (todavía no hay foto real).

**Escritorio**
```css
@media (min-width: 1024px) {
  .hero { position: relative; display: grid; align-items: center; min-height: clamp(440px, 62vh, 600px); }
  .hero-media { position: absolute; inset: 0; aspect-ratio: auto; justify-items: end; padding-right: 12%; }
  .hero-media::after {   /* degradado blanco para que el texto se lea sobre la foto */
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(90deg, rgb(255 255 255 / 0.94) 0%, rgb(255 255 255 / 0.8) 38%, rgb(255 255 255 / 0) 62%);
  }
  .hero-content { position: relative; padding-block: var(--space-12) var(--space-20); }
  .hero-text h1, .hero-text .lead { max-width: 36rem; }
}
```
> En escritorio la imagen ocupa todo el fondo y el texto va encima, a la izquierda. El
> `::after` pinta un degradado blanco→transparente para garantizar contraste del texto.

**Tarjetas de servicios**
```css
.features { display: grid; gap: var(--grid-gap); margin-top: var(--space-8); }
.feature { display: grid; grid-template-columns: 40px 1fr; gap: var(--space-4); padding: var(--space-5); background: #fff; border: var(--border); border-radius: var(--radius-lg); … }
.feature:hover { border-color: var(--color-navy-800); box-shadow: var(--shadow-md); transform: translateY(-2px); }
.feature:has(a:focus-visible) { box-shadow: var(--focus-ring); }
.feature h3 a::after { content: ''; position: absolute; inset: 0; }   /* tarjeta clicable */
.feature h3 a:focus-visible { box-shadow: none; }
```
```css
@media (min-width: 1024px) {
  .features { grid-template-columns: repeat(3, 1fr); margin-top: calc(-1 * var(--space-12)); }
}
```
> Las 3 tarjetas de servicio se "montan" 48px sobre el hero (`margin-top` negativo).

**Franja "Depas que se pagan solos"**
```css
.bridge { display: grid; gap: var(--space-6); grid-template-areas: 'head' 'grid' 'cta'; }
```
> `grid-template-areas` nombra las zonas del layout. Móvil: título / tarjetas / botón.

```css
@media (min-width: 1024px) {
  .bridge { grid-template-columns: 1fr auto; grid-template-areas: 'head cta' 'grid grid'; align-items: end; }
}
```
> Escritorio: el botón "Ver todos" sube a la derecha del título.

### `capital.astro`

**Hero**
```css
@media (min-width: 1024px) {
  .hero { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr); gap: var(--space-12); }
}
```
> Escritorio: texto (1fr) a la izquierda, pasos (1.2fr) a la derecha.

**Barra "Top 10"**
```css
.top10 { display: flex; align-items: center; justify-content: space-between; min-height: 64px;
  border: var(--border-width-strong) solid var(--color-border-strong); border-radius: var(--radius-md); … }
.top10:hover { background: var(--color-navy-50); }
.long { display: none; }   /* texto corto en móvil */
@media (min-width: 640px) { .long { display: inline; } .short { display: none; } }
```
> Alterna el texto "Ver" (móvil) ↔ "Ver el top 10" (escritorio).

**Pasos**
```css
@media (min-width: 640px) { .stepper { display: grid; grid-template-columns: repeat(4, 1fr); } }
```

**Aliados**
```css
.allies-list li { display: grid; place-items: center; min-height: 44px; border: 1px dashed var(--color-border); … }
```
> Cajas punteadas que representan logos futuros.
```css
@media (min-width: 1024px) { .allies-list li { flex: 1; border: 0; border-left: var(--border-subtle); } }
```

**Formulario en inglés**
```css
input { width: 100%; height: var(--control-h-md); padding: 0 14px; font-size: 16px; border: 1px solid var(--color-border-input); border-radius: var(--radius-md); background: #fff; }
```
> `font-size: 16px` en inputs evita que iOS haga zoom automático al tocar el campo.

```css
.prefix { position: relative; }
.prefix span { position: absolute; top: 50%; left: 14px; transform: translateY(-50%); … }  /* el "USD" */
.prefix input { padding-left: 52px; }   /* deja espacio para el "USD" */
```
> Técnica de "prefijo dentro del input": el texto "USD" se posiciona encima del campo.

---

## 4. Resumen de técnicas modernas usadas (y por qué son buenas)

| Técnica | Dónde | Qué resuelve |
|---|---|---|
| CSS custom properties (`var()`) | tokens.css | Una sola fuente de verdad; cambios globales |
| `clamp()` / `min()` / `max()` | tokens, container, drawer | Tipografía fluida y anchos responsivos sin media queries |
| Scoped styles | todos los `.astro` | Evita colisiones de clases entre componentes |
| `:has()` | PropertyCard, index | Estilizar el padre según el foco del hijo |
| `@container` / `container-type` | PropertyCard | Reaccionar al ancho del componente, no de la ventana |
| `aspect-ratio` | PropertyCard, hero | Reservar espacio de imagen sin saltos de layout |
| `text-wrap: balance` | global | Títulos con líneas equilibradas |
| `dvh` + `env(safe-area-inset-bottom)` | Header | Viewport móvil real y notch del iPhone |
| `scroll-snap` + `overscroll-behavior` | PropertyGrid | Carrusel táctil que "encaja" |
| `prefers-reduced-motion` | todos | Respetar a quien no quiere animaciones |
| `:focus-visible` + `.sr-only` + skip-link | global | Accesibilidad por teclado y lectores de pantalla |
| `aria-current` / `aria-expanded` en CSS | Header, OwnerDropdown | Estilo ligado al estado accesible (no clases JS extra) |
| `<dialog>` + `::backdrop` | Header | Drawer con foco atrapado y cierre con Esc gratis |

---

## 5. Mejoras aplicadas (changelog)

Tras la revisión se aplicaron estas mejoras. Los ejemplos de código de más arriba muestran los
valores ORIGINALES de tamaño de letra (ej. `1.125rem`); hoy el código usa los tokens nuevos
(`--fs-18`, etc.).

1. **Tamaños de fuente tokenizados.** Se agregaron 5 tokens intermedios a `tokens.css` y se
   reemplazaron todos los literales repetidos:

   | Token | Valor | Reemplaza a |
   |---|---|---|
   | `--fs-13` | `0.8125rem` (13px) | `.disclaimer`, `PropertyCard dt` |
   | `--fs-15` | `0.9375rem` (15px) | `.btn--sm`, `.sub` (Footer), `p` (Step), `@container dd` |
   | `--fs-18` | `1.125rem` (18px) | `.logo`, `.step h3`, `.drawer-links a`, `.top10`, `.intl-title` |
   | `--fs-20` | `1.25rem` (20px) | `.title` (Footer), `.logo` (desktop), `.allies-label` |
   | `--fs-22` | `1.375rem` (22px) | `.title` (Footer desktop) |

2. **`inlineStylesheets` → `'auto'`** (en `astro.config.mjs`). Inlinea el CSS pequeño y
   externaliza el grande: mejor caché del navegador cuando el sitio crezca.

3. **`font: inherit` ampliado.** Ahora `button, input, select, textarea` heredan la fuente
   (antes solo `button, input`).

4. **Números mágicos de `Step.astro` extraídos** a variables locales:
   - `--step-dot: 32px` (40px en desktop) → diámetro del círculo numerado.
   - `--step-line: 2px` → grosor de la línea conectora.
   - La posición de la línea ahora se calcula: `calc(var(--step-dot) / 2 - var(--step-line) / 2)`.
     Si algún día cambia el círculo, la línea se realinea sola.

5. **Padding del `main` atado al FAB.** Se agregó `--fab-size: 3.5rem` a `tokens.css`; ahora
   `Header.astro` lo usa para el tamaño del FAB y `BaseLayout.astro` para el
   `padding-bottom: calc(var(--fab-size) + var(--space-2))` (antes era `var(--space-16)`).

El build compila las 8 páginas sin errores.
