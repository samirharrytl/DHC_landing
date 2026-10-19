import { expect, test } from './fixtures'

test.describe('Capital', () => {
  test('filtra mientras escribes y con los filtros rápidos', async ({ page }) => {
    await page.goto('/capital')
    const cards = page.locator('#lista-depas [data-property-card]:visible')
    await expect(cards).toHaveCount(3)
    await expect(cards.first()).toContainText('De propietario')

    await page.getByRole('searchbox').fill('surquillo')
    await expect(cards).toHaveCount(1)
    await expect(cards.first()).toContainText('Surquillo')

    await page.getByRole('button', { name: 'Limpiar filtros' }).click()
    await expect(cards).toHaveCount(3)
    await page.getByRole('button', { name: 'Lince', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Lince', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(cards).toHaveCount(1)

    await page.getByRole('button', { name: 'Hasta S/ 300,000' }).click()
    await expect(cards).toHaveCount(0)
    await expect(page.getByText('No encontramos departamentos')).toBeVisible()
  })

  test('las anclas de la página existen', async ({ page }) => {
    await page.goto('/capital')
    for (const id of ['como-funciona', 'proyectos', 'lista-depas', 'aliados', 'top-10']) {
      await expect(page.locator(`#${id}`)).toHaveCount(1)
    }
    await expect(page.locator('#top-10 li')).toHaveCount(6)
  })

  test('"Para ti" aparece después de ver un depa', async ({ page }) => {
    await page.goto('/capital')
    await expect(page.getByRole('heading', { name: 'Para ti, según lo que has visto' })).toBeHidden()
    await page.goto('/capital/lince-av-arequipa-cuadra-12')
    await page.goto('/capital')
    const row = page.locator('[data-for-you]')
    await expect(row.getByRole('heading', { name: 'Para ti, según lo que has visto' })).toBeVisible()
    await expect(row.locator('article')).not.toHaveCount(0)
    await expect(row).not.toContainText('Lince · Av. Arequipa')
  })

  test('el detalle muestra datos, aliado y depas similares', async ({ page }) => {
    await page.goto('/capital')
    await page.getByRole('link', { name: 'Ver más detalle' }).first().click()
    await expect(page).toHaveURL(/\/capital\/[a-z0-9-]+\/?$/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText('Precio de compra')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Depas similares que te pueden interesar' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Contactar', exact: true })).toHaveAttribute(
      'href',
      /\/capital\/empecemos\?depa=/,
    )
  })

  test('Contactar lleva a "Te acompañamos" con ese depa', async ({ page }) => {
    await page.goto('/capital/miraflores-calle-schell-cuadra-3')
    await page.getByRole('link', { name: 'Contactar', exact: true }).click()
    await expect(page.getByText('Departamento seleccionado')).toBeVisible()
    await expect(page.getByText('Proyecto de Urbana')).toBeVisible()
  })
})

test.describe('Inmobiliarias aliadas', () => {
  test('la franja de aliados lleva a los proyectos de la inmobiliaria', async ({ page }) => {
    await page.goto('/capital')
    await page
      .locator('#aliados')
      .getByRole('link', { name: /Urbana/ })
      .click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Proyectos de Urbana')
    await expect(page.getByText('3 proyectos encontrados')).toBeVisible()
    await expect(page.locator('[data-property-card]').first()).toContainText('Precio desde')

    await page.getByRole('searchbox').fill('miraflores')
    await page.getByRole('button', { name: 'Buscar' }).click()
    await expect(page.getByText('1 proyecto encontrado')).toBeVisible()
    await page.getByRole('button', { name: 'Limpiar filtros' }).click()
    await expect(page.getByText('3 proyectos encontrados')).toBeVisible()
  })
})

test('página 404', async ({ page }) => {
  const response = await page.goto('/no-existe')
  expect(response?.status()).toBe(404)
  await expect(page.getByRole('heading', { name: 'No encontramos esta página' })).toBeVisible()
})
