import { expect, mockApi, test } from './fixtures'

test('Me interesa → Guarda tus depas → Mis depas → WhatsApp', async ({ page }) => {
  const leads = await mockApi(page, '/v1/leads', 201, {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  })
  await page.goto('/capital')

  const cards = page.locator('[data-property-card]')
  const first = (await cards.nth(0).locator('h3').textContent())!.trim()
  const second = (await cards.nth(1).locator('h3').textContent())!.trim()
  await cards
    .nth(0)
    .getByRole('button', { name: /Me interesa/ })
    .click()
  await expect(cards.nth(0).getByRole('button', { name: /Quitar/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('[data-cart-count]')).toHaveText('1')

  // Al guardar el segundo depa se ofrece "Guarda tus depas"
  await cards
    .nth(1)
    .getByRole('button', { name: /Me interesa/ })
    .click()
  const dialog = page.getByRole('dialog', { name: 'Guarda tus depas' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText(`2 departamentos seleccionados: ${first} y ${second}`)
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
  await dialog.getByRole('link', { name: 'Ver Mis depas' }).click()

  await expect(page).toHaveURL(/\/mis-depas\/?$/)
  await expect(page.locator('[data-saved-list] article')).toHaveCount(2)
  await expect(page.locator('[data-summary-count]')).toHaveText('2')
  await expect(page.getByText('Guardado para Ana')).toBeVisible()

  // "Empecemos con estos" abre WhatsApp con la lista y registra el lead del carrito
  const whatsapp = page.getByRole('link', { name: /Empecemos con estos/ })
  await expect(whatsapp).toHaveAttribute(
    'href',
    new RegExp(`wa\\.me/51900000000.*${encodeURIComponent(first)}`),
  )
  const popup = page.waitForEvent('popup')
  await whatsapp.click()
  await (await popup).close()
  await expect.poll(() => leads.length).toBe(2)
  expect(leads[1]).toMatchObject({ source: 'cart', propertyIds: [expect.any(String), expect.any(String)] })

  await page.goto('/mis-depas')
  await page.getByRole('button', { name: `Quitar ${first} de la selección` }).click()
  await page.getByRole('button', { name: `Quitar ${second} de la selección` }).click()
  await expect(page.getByText('Aún no guardaste departamentos.')).toBeVisible()
  await expect(page.locator('[data-cart-count]')).toBeHidden()
})

test('/carrito y /capital/empecemos redirigen a /mis-depas', async ({ page }) => {
  for (const path of ['/carrito', '/capital/empecemos']) {
    await page.goto(path)
    await expect(page).toHaveURL(/\/mis-depas\/?$/)
  }
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
  const dialog = page.getByRole('dialog', { name: 'Guarda tus depas' })
  await dialog.getByRole('button', { name: 'Seguir viendo' }).first().click()
  await expect(dialog).toBeHidden()
  await cards
    .nth(2)
    .getByRole('button', { name: /Me interesa/ })
    .click()
  await expect(dialog).toBeHidden()
})
