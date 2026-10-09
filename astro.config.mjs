// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // Dominio final: Astro lo usa para armar URLs absolutas (og:image, og:url)
  site: 'https://depahostperu.com',

  // Precarga una página cuando el mouse pasa sobre un link con data-astro-prefetch
  prefetch: true,

  build: {
    // 'auto' (default) inlinea el CSS pequeño y externaliza el grande:
    // menos peticiones cuando es chico, y caché del navegador cuando crece.
    inlineStylesheets: 'auto',
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
  ],
});
