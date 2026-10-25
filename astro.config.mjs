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

  // "Mis depas" vivía en /carrito: los links viejos siguen funcionando
  redirects: {
    '/carrito': '/mis-depas',
    // "Te acompañamos" se unió a Mis depas: ahí se arma la lista y se escribe por WhatsApp
    '/capital/empecemos': '/mis-depas',
  },

  integrations: [
    sitemap({
      // "Mis depas" depende del navegador de cada persona: no se indexa
      filter: (page) => !/\/(carrito|mis-depas|capital\/empecemos)\/?$/.test(page),
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
    },
  },

  // Pre-optimiza en desarrollo las dependencias que solo usan los scripts del navegador
  vite: {
    optimizeDeps: { include: ['openapi-fetch'] },
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
    {
      provider: fontProviders.fontsource(),
      name: 'Inter',
      cssVariable: '--font-inter',
      weights: ['400 700'], // fuente variable: todos los pesos entre 400 y 700
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['sans-serif'],
    },
    // Serif editorial para los títulos de Capital y Propietarios (combina con la serif del logo).
    // Solo el peso 500 (el de .display): la versión variable pesa ~130 KB, esta ~25 KB.
    {
      provider: fontProviders.fontsource(),
      name: 'Newsreader',
      cssVariable: '--font-newsreader',
      weights: [500],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['Georgia', 'serif'],
    },
  ],
})
