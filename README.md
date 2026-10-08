# Depa Host Perú · sitio web

Sitio de **Depa Host Perú** (depahostperu.com): reservar estadías, vender o alquilar tu depa,
y **DepaHost Capital** (comprar departamentos en Lima para que rindan).

## Stack

- [Astro](https://astro.build) 7 (sitio estático)
- CSS propio con variables (tokens de diseño), sin frameworks de CSS
- Fuente Inter autoalojada con la API de fuentes de Astro (`astro.config.mjs`)
- Node 22 + pnpm

## Comandos

| Comando | Qué hace |
|---|---|
| `pnpm install` | Instala las dependencias |
| `pnpm dev` | Servidor de desarrollo en `http://localhost:4321` |
| `pnpm astro dev --background` | Igual, pero en segundo plano (`pnpm astro dev stop` para pararlo) |
| `pnpm build` | Construye el sitio final en `dist/` |
| `pnpm preview` | Sirve `dist/` para revisarlo antes de publicar |

## Estructura

```text
public/                 favicon, imagen para redes (og-default.png)
src/
├── components/         piezas reutilizables (Header, Footer, PropertyCard, Button…)
├── data/
│   ├── contacto.ts     número de WhatsApp y armado de links wa.me
│   └── depas.ts        depas de ejemplo + texto del disclaimer
├── layouts/
│   ├── BaseLayout.astro         <head>, header y footer de todas las páginas
│   └── PlaceholderLayout.astro  páginas "en construcción"
├── pages/              una página por archivo (index = home, capital, propietarios…)
└── styles/
    ├── tokens.css      colores, tamaños, espacios (design tokens)
    └── global.css      base, contenedor, botones y utilidades
```

## Pendientes / textos de relleno

| Qué | Dónde |
|---|---|
| Número de WhatsApp (`51XXXXXXXXX`) | `src/data/contacto.ts` |
| Supuestos del disclaimer (`[plazo]`, `[X]`, `[fecha]`) | `src/data/depas.ts` |
| Datos de los depas (cuota y renta son de ejemplo) | `src/data/depas.ts` |
| RUC (`RUC [pendiente]`) | `src/components/Footer.astro` |
| Logos de aliados (`Aliado 1–5`) | `src/pages/capital.astro` |
| Qué hace el formulario en inglés (hoy no envía nada) | `src/pages/capital.astro` |
| Fotos reales (hero y tarjetas) y logo SVG oficial | `src/pages/index.astro`, `src/components/PropertyCard.astro`, `src/components/Logo.astro` |
| Imagen final para redes sociales | `public/og-default.png` |
| Páginas en construcción (Estadías, Nosotros, legales) | `src/pages/` |
