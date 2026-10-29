// Errores del navegador a Sentry, solo si hay PUBLIC_SENTRY_DSN. El SDK se descarga aparte
// (import dinámico), así que sin DSN no pesa nada.
import { PUBLIC_SENTRY_DSN } from 'astro:env/client'

if (PUBLIC_SENTRY_DSN) {
  import('@sentry/browser')
    .then((Sentry) => {
      Sentry.init({ dsn: PUBLIC_SENTRY_DSN, environment: import.meta.env.MODE, sampleRate: 1 })
    })
    .catch(reportError)
}
