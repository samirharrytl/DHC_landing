import assert from 'node:assert/strict'
import { expect, mockApi, test } from './fixtures'

test('Me interesa → Guarda tus inmuebles → Mis inmuebles → WhatsApp', async ({ page }) => {
  const leads = await mockApi(page, '/v1/leads', 201, {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  })
  await page.goto('/capital')

  const cards = page.locator('[data-property-card]')
  const first = (await cards.nth(0).locator('h3').innerText()).trim()
  const second = (await cards.nth(1).locator('h3').innerText()).trim()
  await cards
    .nth(0)
    .getByRole('button', { name: /Me interesa/ })
    .click()
  await expect(cards.nth(0).getByRole('button', { name: /Quitar/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('[data-cart-count]')).toHaveText('1')

  // Al guardar el segundo inmueble se ofrece "Guarda tus inmuebles"
  await cards
    .nth(1)
    .getByRole('button', { name: /Me interesa/ })
    .click()
  const dialog = page.getByRole('dialog', { name: 'Guarda tus inmuebles' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText(`2 inmuebles seleccionados: ${first} y ${second}`)
  await dialog.getByLabel('Nombre').fill('ana lucía')
  await dialog.getByLabel('Celular').fill('987654321')
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Guardar y continuar' }).click()
  await expect(dialog.getByRole('heading', { name: 'Listo, Ana' })).toBeVisible()
  expect(leads[0]).toMatchObject({
    source: 'saved-list',
    name: 'ana lucía',
    propertyIds: [expect.any(String), expect.any(String)],
  })
  await dialog.getByRole('link', { name: 'Ver Mis inmuebles' }).click()

  await expect(page).toHaveURL(/\/mis-inmuebles\/?$/)
  await expect(page.locator('[data-saved-list] article')).toHaveCount(2)
  await expect(page.locator('[data-summary-count]')).toHaveText('2')
  await expect(page.getByText('Guardado para Ana')).toBeVisible()

  // "Conversemos ahora" abre WhatsApp con la lista y registra el lead del carrito
  const whatsapp = page.getByRole('link', { name: /Conversemos ahora/ })
  await expect(whatsapp).toHaveAttribute(
    'href',
    new RegExp(`wa\\.me/51900000000.*${encodeURIComponent(first)}`),
  )
  const popup = page.waitForEvent('popup')
  await whatsapp.click()
  await (await popup).close()
  await expect.poll(() => leads.length).toBe(2)
  expect(leads[1]).toMatchObject({
    source: 'cart',
    propertyIds: [expect.any(String), expect.any(String)],
    details: { contacto: 'Conversemos ahora' },
  })

  // "Programar una sesión" abre un formulario con día, horario y modalidad; el lead llega al panel
  await page.getByRole('button', { name: /Programar una sesión/ }).click()
  const schedule = page.getByRole('dialog', { name: 'Programar una sesión' })
  await expect(schedule).toContainText(`2 inmuebles seleccionados: ${first} y ${second}`)
  await schedule.getByLabel('Nombre').fill('ana lucía')
  await schedule.getByLabel('Celular').fill('987654321')
  const day = await schedule.getByLabel('Día').getAttribute('min')
  assert.ok(day)
  await schedule.getByLabel('Día').fill(day)
  await schedule.getByLabel('Horario').selectOption('Tarde (15:00 a 18:00)')
  await schedule.getByRole('radio', { name: 'Llamada', exact: true }).check()
  await schedule.getByRole('checkbox').check()
  await schedule.getByRole('button', { name: 'Programar sesión' }).click()
  await expect(schedule.getByRole('heading', { name: 'Listo, Ana' })).toBeVisible()
  await expect(schedule).toContainText('tarde (15:00 a 18:00)')
  expect(leads[2]).toMatchObject({
    source: 'cart',
    name: 'ana lucía',
    phone: '987654321',
    consent: true,
    propertyIds: [expect.any(String), expect.any(String)],
    details: {
      contacto: 'Programar una sesión',
      fecha: day,
      horario: 'Tarde (15:00 a 18:00)',
      modalidad: 'Llamada',
    },
  })
  await schedule.getByRole('button', { name: 'Entendido' }).click()
  await expect(schedule).toBeHidden()

  await page.goto('/mis-inmuebles')
  await page.getByRole('button', { name: `Quitar ${first} de la selección` }).click()
  await page.getByRole('button', { name: `Quitar ${second} de la selección` }).click()
  await expect(page.getByText('Aún no guardaste inmuebles.')).toBeVisible()
  await expect(page.locator('[data-cart-count]')).toBeHidden()
})

test('/carrito, /capital/empecemos y /mis-depas redirigen a /mis-inmuebles', async ({ page }) => {
  for (const path of ['/carrito', '/capital/empecemos', '/mis-depas']) {
    await page.goto(path)
    await expect(page).toHaveURL(/\/mis-inmuebles\/?$/)
  }
})

test('las direcciones anteriores conservan los filtros y el inmueble a agregar', async ({ page }) => {
  await page.goto('/capital/depas?distrito=brena')
  await expect(page).toHaveURL(/\/capital\/inmuebles\/?\?distrito=brena$/)
  await expect(page.locator('[data-results] [data-property-card]:visible')).toHaveCount(1)

  await page.goto('/capital/miraflores-calle-schell-cuadra-3')
  const href = await page.getByRole('link', { name: 'Contactar', exact: true }).getAttribute('href')
  const [, id] = href?.split('=') ?? []
  assert.ok(id)
  await page.goto(`/mis-depas?agregar=${id}`)
  await expect(page).toHaveURL(/\/mis-inmuebles\/?$/)
  await expect(page.locator('[data-saved-list] article')).toHaveCount(1)
})

test('"Seguir viendo" cierra el aviso y no vuelve a aparecer enseguida', async ({ page }) => {
  await page.goto('/capital')
  const cards = page.locator('[data-property-card]')
  await cards
    .nth(0)
    .getByRole('button', { name: /Me interesa/ })
    .click()
  await cards
    .nth(1)
    .getByRole('button', { name: /Me interesa/ })
    .click()
  const dialog = page.getByRole('dialog', { name: 'Guarda tus inmuebles' })
  await dialog.getByRole('button', { name: 'Seguir viendo' }).first().click()
  await expect(dialog).toBeHidden()
  await cards
    .nth(2)
    .getByRole('button', { name: /Me interesa/ })
    .click()
  await expect(dialog).toBeHidden()
})
