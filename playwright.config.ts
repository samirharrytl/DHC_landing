import { defineConfig, devices } from '@playwright/test'

// Las pruebas corren contra el build estático servido con `astro preview`.
// PUBLIC_API_URL apunta a un dominio falso: cada prueba intercepta las llamadas con page.route().
const PORT = 4329

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    // --ignore-lock: mantiene el servidor en primer plano (Astro lo pasa a segundo plano si detecta un agente)
    command: `pnpm build && pnpm astro preview --port ${PORT} --host 127.0.0.1 --ignore-lock`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      PUBLIC_API_URL: 'https://api.test.local',
      PUBLIC_WHATSAPP_NUMBER: '51900000000',
      PUBLIC_TURNSTILE_SITE_KEY: '',
      PUBLIC_CLARITY_ID: '',
    },
  },
})
