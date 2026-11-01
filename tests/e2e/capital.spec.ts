import assert from 'node:assert/strict'
import { expect, test } from './fixtures'

test.describe('Capital', () => {
  test('filtra mientras escribes y con los filtros rápidos', async ({ page }) => {
    await page.goto('/capital')
    const cards = page.locator('#lista-inmuebles [data-property-card]:visible')
    // Máximo 6 a la vista: los demás se ven en "Todos los inmuebles"
    await expect(cards).toHaveCount(6)
    await expect(page.locator('#lista-inmuebles [data-property-card]')).toHaveCount(12)
    await expect(cards.first()).toContainText('De propietario')
    // Los filtros rápidos son distritos y precio; la rentabilidad está en "Todos los inmuebles"
    await expect(page.locator('[data-favorite-filter]', { hasText: 'anual' })).toHaveCount(0)

    await page.getByRole('searchbox').fill('surquillo')
    await expect(cards).toHaveCount(1)
    await expect(cards.first()).toContainText('Surquillo')

    await page.getByRole('button', { name: 'Limpiar filtros' }).click()
    await expect(cards).toHaveCount(6)
    await page.getByRole('button', { name: 'Lince', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Lince', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(cards).toHaveCount(2)
    await page.getByRole('searchbox').fill('arequipa')
    await expect(cards).toHaveCount(1)

    await page.getByRole('searchbox').fill('surquillo')
    await expect(cards).toHaveCount(0)
    await expect(page.getByText('No encontramos inmuebles')).toBeVisible()
  })

  test('las anclas de la página existen', async ({ page }) => {
    await page.goto('/capital')
    for (const id of ['como-funciona', 'proyectos', 'lista-inmuebles']) {
      await expect(page.locator(`#${id}`)).toHaveCount(1)
    }
    await expect(page.locator('#top-10')).toHaveCount(0)
    // Por ahora la portada no lleva "Para ti" ni la franja de aliados
    await expect(page.locator('[data-for-you], #aliados')).toHaveCount(0)
    // "Ver todos los proyectos" también va dentro de la lista
    await expect(
      page.locator('#lista-inmuebles').getByRole('link', { name: /Ver todos los proyectos/ }),
    ).toHaveAttribute('href', '/capital/inmuebles')
    // El inicio de Capital solo lleva "Ver todos los proyectos"
    await expect(page.locator('[data-hero] .ctas').getByRole('link')).toHaveText(['Ver todos los proyectos'])
  })

  test('el menú tiene Inicio, Compra y Vende; Compra queda marcado en toda la compra', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/capital')
    const nav = page.getByRole('navigation', { name: 'Principal', exact: true })
    await expect(nav.getByRole('link')).toHaveText(['Inicio', 'Compra', 'Vende'])
    await expect(nav.getByRole('link', { name: 'Compra' })).toHaveAttribute('aria-current', 'page')
    await page.goto('/capital/inmuebles')
    await expect(nav.getByRole('link', { name: 'Compra' })).toHaveAttribute('aria-current', 'true')
    await expect(nav.getByRole('link', { name: 'Vende' })).toHaveAttribute('href', '/propietarios')
  })

  test('el detalle muestra datos y Contactar', async ({ page }) => {
    await page.goto('/capital')
    await page.getByRole('link', { name: 'Ver más detalle' }).first().click()
    await expect(page).toHaveURL(/\/capital\/[a-z0-9-]+\/?$/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText('Precio de compra')).toBeVisible()
    // En la ficha va solo la rentabilidad: por ahora sin alquiler estimado ni "se paga en"
    await expect(page.getByText('rentabilidad anual')).toBeVisible()
    await expect(page.getByText('alquiler al mes')).toHaveCount(0)
    await expect(page.getByText('se paga en')).toHaveCount(0)
    // Por ahora el detalle no lleva "Te acompaña" ni inmuebles similares
    await expect(
      page.getByRole('heading', { name: /Te acompaña|Aliado del proyecto|similares/ }),
    ).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Contactar', exact: true })).toHaveAttribute(
      'href',
      /\/mis-inmuebles\?agregar=/,
    )
  })

  test('Contactar agrega el inmueble a Mis inmuebles y abre el carrito', async ({ page }) => {
    await page.goto('/capital/miraflores-calle-schell-cuadra-3')
    await page.getByRole('link', { name: 'Contactar', exact: true }).click()
    await expect(page).toHaveURL(/\/mis-inmuebles\/?$/)
    await expect(page.locator('[data-saved-list] article')).toHaveCount(1)
    await expect(page.locator('[data-saved-list]')).toContainText('Urbana')
    await expect(page.locator('[data-cart-count]')).toHaveText('1')
  })

  test('la galería del detalle cambia de foto con las miniaturas', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/capital/lince-av-arequipa-cuadra-12')
    const thumbs = page.locator('.thumbs').getByRole('button', { name: /^Ver (foto|video)/ })
    // 4 fotos y 1 video
    await expect(thumbs).toHaveCount(5)
    await thumbs.nth(2).click()
    await expect(thumbs.nth(2)).toHaveAttribute('aria-current', 'true')
    await expect(thumbs.nth(0)).not.toHaveAttribute('aria-current', 'true')
    await thumbs.nth(4).click()
    await expect(page.locator('[data-gallery-track] video')).toBeVisible()
  })

  test('las fotos se amplían a pantalla completa y se recorren con el teclado', async ({ page }) => {
    await page.goto('/capital/lince-av-arequipa-cuadra-12')
    await page.getByRole('button', { name: 'Ampliar foto 1 de 4' }).click()
    const viewer = page.getByRole('dialog', { name: /Fotos y videos de Av\. Arequipa, Lince/ })
    await expect(viewer).toBeVisible()
    await expect(viewer.locator('[data-lb-current]')).toHaveText('1')
    await page.keyboard.press('ArrowRight')
    await expect(viewer.locator('[data-lb-current]')).toHaveText('2')
    await page.keyboard.press('Escape')
    await expect(viewer).toBeHidden()
  })
})

test.describe('Todos los inmuebles', () => {
  test('"Ver todos los proyectos" abre la búsqueda con buscador, orden y URL', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/capital')
    await page.getByRole('link', { name: 'Ver todos los proyectos' }).first().click()
    await expect(page).toHaveURL(/\/capital\/inmuebles\/?$/)
    const cards = page.locator('[data-results] [data-property-card]:visible')
    const count = page.locator('[data-results-count]')
    await expect(count).toHaveText('36 resultados')
    await expect(cards).toHaveCount(12) // la primera página
    // Por ahora solo buscador, orden y páginas: sin filtros laterales, "Cerca de" ni mapa
    await expect(page.getByRole('checkbox')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Mapa', exact: true })).toHaveCount(0)
    await expect(page.getByLabel('Ordenar por').locator('option[value="cercania"]')).toHaveCount(0)

    await page.getByRole('searchbox').fill('urbana')
    await expect(count).toHaveText('6 resultados para "urbana"')
    await expect(cards).toHaveCount(6)
    await page.getByLabel('Ordenar por').selectOption('precio-asc')
    await expect(cards.first()).toContainText('Lince')
    await expect(cards.last()).toContainText('Miraflores')
    await expect(page).toHaveURL(/q=urbana.*orden=precio-asc/)

    // La búsqueda se puede compartir: al recargar sigue igual
    await page.reload()
    await expect(cards).toHaveCount(6)
    await expect(page.getByRole('searchbox')).toHaveValue('urbana')

    await page.getByRole('searchbox').fill('no-existe-nada')
    await page.getByRole('button', { name: 'Limpiar búsqueda' }).click()
    await expect(count).toHaveText('36 resultados')
    await expect(cards).toHaveCount(12)
  })

  test('los links con filtros de antes muestran todos los inmuebles', async ({ page }) => {
    await page.goto('/capital/inmuebles?distrito=brena&vista=mapa&orden=cercania')
    await expect(page.locator('[data-results-count]')).toHaveText('36 resultados')
    await expect(page).toHaveURL(/\/capital\/inmuebles\/?$/)
  })

  test('la lista va en páginas de 12 y "Atrás" vuelve a la anterior', async ({ page }) => {
    await page.goto('/capital/inmuebles')
    const cards = page.locator('[data-results] [data-property-card]:visible')
    const pages = page.getByRole('navigation', { name: 'Páginas de resultados' })
    await expect(cards).toHaveCount(12)
    await expect(pages).toContainText('Mostrando 1–12 de 36 inmuebles')
    await expect(pages.getByRole('link', { name: 'Página 1' })).toHaveAttribute('aria-current', 'page')
    await expect(pages.locator('[data-page-step="-1"]')).toHaveAttribute('aria-disabled', 'true')
    const first = await cards.first().getAttribute('data-id')
    assert.ok(first)

    await pages.getByRole('link', { name: 'Siguiente' }).click()
    await expect(page).toHaveURL(/pagina=2/)
    await expect(pages).toContainText('Mostrando 13–24 de 36 inmuebles')
    await expect(cards).toHaveCount(12)
    await expect(cards.first()).not.toHaveAttribute('data-id', first)
    // El lector de pantalla sigue en la página nueva
    await expect(page.getByRole('heading', { name: 'Resultados, página 2 de 3' })).toBeFocused()

    await pages.getByRole('link', { name: 'Página 3' }).click()
    await expect(pages).toContainText('Mostrando 25–36 de 36 inmuebles')
    await expect(pages.locator('[data-page-step="1"]')).toHaveAttribute('aria-disabled', 'true')

    // "Atrás" vuelve a la página anterior y al recargar sigue en ella
    await page.goBack()
    await expect(page).toHaveURL(/pagina=2/)
    await expect(pages).toContainText('Mostrando 13–24')
    await page.reload()
    await expect(pages).toContainText('Mostrando 13–24')

    // Cambiar la búsqueda vuelve a la primera página
    await page.getByLabel('Ordenar por').selectOption('precio-asc')
    await expect(pages).toContainText('Mostrando 1–12')
    await expect(page).toHaveURL(/orden=precio-asc$/)

    // Una página que no existe muestra la última
    await page.goto('/capital/inmuebles?pagina=9')
    await expect(pages).toContainText('Mostrando 25–36')
    await expect(page).toHaveURL(/pagina=3/)
  })
})

test.describe('Inmobiliarias aliadas', () => {
  test('la página de la inmobiliaria muestra sus proyectos', async ({ page }) => {
    await page.goto('/capital/aliados/urbana')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Proyectos de Urbana')
    await expect(page.getByText('6 proyectos encontrados')).toBeVisible()
    await expect(page.locator('[data-property-card]').first()).toContainText('Precio desde')

    await page.getByRole('searchbox').fill('miraflores')
    await page.getByRole('button', { name: 'Buscar' }).click()
    await expect(page.getByText('1 proyecto encontrado')).toBeVisible()
    await page.getByRole('button', { name: 'Limpiar filtros' }).click()
    await expect(page.getByText('6 proyectos encontrados')).toBeVisible()
  })
})

test('página 404', async ({ page }) => {
  const response = await page.goto('/no-existe')
  expect(response?.status()).toBe(404)
  await expect(page.getByRole('heading', { name: 'No encontramos esta página' })).toBeVisible()
})
