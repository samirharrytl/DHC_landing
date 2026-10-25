// @ts-check
import { defineConfig, envField, fontProviders } from 'astro/config'
import sitemap from '@astrojs/sitemap'
import { existsSync, readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'

// Dominio de las fotos de la API: variable de entorno del hosting o, en local, el archivo .env
// (y .env.preprod con `astro build --mode preprod`, como hace Astro con el resto de variables)
const readEnv = (/** @type {string} */ file) => (existsSync(file) ? parseEnv(readFileSync(file, 'utf8')) : {})
const modeFlag = process.argv.indexOf('--mode')
const dotenv = {
  ...readEnv('.env'),
  ...(modeFlag > -1 ? readEnv(`.env.${process.argv[modeFlag + 1]}`) : {}),
}
const PUBLIC_MEDIA_HOST = process.env.PUBLIC_MEDIA_HOST || dotenv.PUBLIC_MEDIA_HOST

// https://astro.build/config
export default defineConfig({
  // Dominio final: Astro lo usa para armar URLs absolutas (og:image, og:url, sitemap)
  site: 'https://depahostperu.com',

  // Precarga una página cuando el mouse pasa sobre un link con data-astro-prefetch
  prefetch: true,

  // "Mis inmuebles" vivía en /carrito: los links viejos siguen funcionando.
  // /mis-depas y /capital/depas (nombres anteriores) son páginas propias que conservan ?filtros y
  // ?agregar= al redirigir (src/pages/mis-depas.astro, src/pages/capital/depas.astro).
  redirects: {
    '/carrito': '/mis-inmuebles',
    // "Te acompañamos" se unió a Mis inmuebles: ahí se arma la lista y se escribe por WhatsApp
    '/capital/empecemos': '/mis-inmuebles',
  },

  integrations: [
    sitemap({
      // "Mis inmuebles" depende del navegador de cada persona y las direcciones viejas solo redirigen:
      // no se indexan
      filter: (page) =>
        !/\/(carrito|mis-depas|mis-inmuebles|capital\/empecemos|capital\/depas)\/?$/.test(page),
    }),
  ],

  build: {
    // 'auto' (default) inlinea el CSS pequeño y externaliza el grande:
    // menos peticiones cuando es chico, y caché del navegador cuando crece.
    inlineStylesheets: 'auto',
  },

  // Variables de entorno tipadas. Todas son públicas (llegan al navegador).
  // Se definen en .env (ver .env.example) o en el panel del hosting.
  env: {
    schema: {
      PUBLIC_WHATSAPP_NUMBER: envField.string({
        context: 'client',
        access: 'public',
        default: '51981352247',
      }),
      PUBLIC_CLARITY_ID: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_API_URL: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_TURNSTILE_SITE_KEY: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_SENTRY_DSN: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_MEDIA_HOST: envField.string({ context: 'client', access: 'public', optional: true }),
      // Panel de cuentas (repo depahost-panel). Vacío = no se muestra "Ingresar"
      PUBLIC_PANEL_URL: envField.string({ context: 'client', access: 'public', optional: true }),
      // Mapa de Todos los depas. Vacío = mosaicos de OpenStreetMap. Con mucho tráfico conviene un
      // proveedor con clave (MapTiler, Mapbox…): su URL {z}/{x}/{y} y el texto de atribución que pide
      PUBLIC_MAP_TILE_URL: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_MAP_ATTRIBUTION: envField.string({ context: 'client', access: 'public', optional: true }),
    },
  },

  // Pre-optimiza en desarrollo las dependencias que solo usan los scripts del navegador
  vite: {
    optimizeDeps: { include: ['openapi-fetch', 'leaflet'] },
  },

  // Fotos que vienen de la API (Cloudflare R2): Astro las descarga al construir y las optimiza
  image: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.r2.dev' },
      ...(PUBLIC_MEDIA_HOST ? [{ protocol: 'https', hostname: PUBLIC_MEDIA_HOST }] : []),
    ],
  },

  // Fuente Inter autoalojada: Astro la descarga al construir y la sirve desde nuestro sitio
  // (sin pedirle nada a Google). También genera una fuente de respaldo ajustada a sus medidas.
  fonts: [
    // Poppins: la misma fuente de depahostperu.com, para textos y títulos.
    // No es variable: un archivo por peso (los de --fw-regular a --fw-bold en tokens.css).
    {
      provider: fontProviders.fontsource(),
      name: 'Poppins',
      cssVariable: '--font-poppins',
      weights: [400, 500, 600, 700],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['sans-serif'],
    },
  ],
})
