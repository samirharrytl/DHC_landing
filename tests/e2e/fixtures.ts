import { test as base, expect, type Page, type Route } from '@playwright/test'

export const API = 'https://api.test.local'

// El sitio llama al API con credentials: 'include' (cookie de sesión). Con credenciales, el navegador
// exige el origen exacto (no "*") y allow-credentials, igual que responde el API real.
const cors = (route: Route) => ({
  'access-control-allow-origin': route.request().headers()['origin'] ?? '*',
  'access-control-allow-credentials': 'true',
  'access-control-allow-headers': 'content-type',
  'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE',
})

/** Responde una ruta de la API falsa (incluido el preflight CORS) y devuelve los cuerpos recibidos. */
export async function mockApi(page: Page, path: string, status: number, body: unknown) {
  const received: unknown[] = []
  await page.route(`${API}${path}`, async (route: Route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors(route) })
    received.push(route.request().postDataJSON())
    return route.fulfill({
      status,
      headers: { ...cors(route), 'content-type': 'application/json' },
      json: body,
    })
  })
  return received
}

export const test = base.extend({
  page: async ({ page }, use) => {
    // Sin banner de cookies tapando la pantalla (se prueba aparte)
    await page.addInitScript(() => localStorage.setItem('depahost:consent', 'denied'))
    await use(page)
  },
})

export { expect }
