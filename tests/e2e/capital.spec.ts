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
    for (const id of ['como-funciona', 'proyectos', 'lista-inmuebles', 'aliados']) {
      await expect(page.locator(`#${id}`)).toHaveCount(1)
    }
    await expect(page.locator('#top-10')).toHaveCount(0)
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

  test('"Para ti" aparece después de ver un inmueble', async ({ page }) => {
    await page.goto('/capital')
    await expect(page.getByRole('heading', { name: 'Para ti, según lo que has visto' })).toBeHidden()
    await page.goto('/capital/lince-av-arequipa-cuadra-12')
    await page.goto('/capital')
    const row = page.locator('[data-for-you]')
    await expect(row.getByRole('heading', { name: 'Para ti, según lo que has visto' })).toBeVisible()
    await expect(row.locator('article')).not.toHaveCount(0)
    await expect(row).not.toContainText('Lince · Av. Arequipa')
  })

  test('el detalle muestra datos, aliado y inmuebles similares', async ({ page }) => {
    await page.goto('/capital')
    await page.getByRole('link', { name: 'Ver más detalle' }).first().click()
    await expect(page).toHaveURL(/\/capital\/[a-z0-9-]+\/?$/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText('Precio de compra')).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Inmuebles similares que te pueden interesar' }),
    ).toBeVisible()
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
    const viewer = page.getByRole('dialog', { name: /Fotos y videos de Lince/ })
    await expect(viewer).toBeVisible()
    await expect(viewer.locator('[data-lb-current]')).toHaveText('1')
    await page.keyboard.press('ArrowRight')
    await expect(viewer.locator('[data-lb-current]')).toHaveText('2')
    await page.keyboard.press('Escape')
    await expect(viewer).toBeHidden()
  })
})

test.describe('Todos los inmuebles', () => {
  test('"Ver todos los proyectos" abre la búsqueda con filtros, orden y URL', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/capital')
    await page.getByRole('link', { name: 'Ver todos los proyectos' }).first().click()
    await expect(page).toHaveURL(/\/capital\/inmuebles\/?$/)
    const cards = page.locator('[data-results] [data-property-card]:visible')
    const count = page.locator('[data-results-count]')
    await expect(count).toHaveText('36 resultados')
    await expect(cards).toHaveCount(12) // la primera página

    await page.getByRole('checkbox', { name: /^De proyecto/ }).check()
    await expect(count).toHaveText('24 resultados')
    await expect(cards).toHaveCount(12)
    await page.getByRole('checkbox', { name: /^Urbana/ }).check()
    await expect(cards).toHaveCount(6)
    await page.getByRole('checkbox', { name: /^Miraflores \(/ }).check()
    await expect(cards).toHaveCount(1)
    await expect(cards.first()).toContainText('Calle Schell')
    await expect(page).toHaveURL(/tipo=developer.*distrito=miraflores.*inmobiliaria=urbana/)

    await page.getByRole('button', { name: 'Quitar filtro: Miraflores' }).click()
    await expect(cards).toHaveCount(6)
    await page.getByLabel('Ordenar por').selectOption('precio-asc')
    await expect(cards.first()).toContainText('Lince')
    await expect(cards.last()).toContainText('Miraflores')

    // La búsqueda se puede compartir: al recargar sigue igual
    await page.reload()
    await expect(cards).toHaveCount(6)
    await expect(page.getByRole('checkbox', { name: /^Urbana/ })).toBeChecked()

    await page.getByRole('button', { name: 'Limpiar todo' }).click()
    await expect(count).toHaveText('36 resultados')
    await expect(cards).toHaveCount(12)
  })

  test('"Cerca de" ordena por distancia a un lugar y filtra por km', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/capital/inmuebles')
    const cards = page.locator('[data-results] [data-property-card]:visible')
    await page.getByLabel('O elige un lugar').selectOption('larcomar')
    await expect(page.getByLabel('Ordenar por')).toHaveValue('cercania')
    await expect(cards.first()).toContainText('Av. José Larco cuadra 8')
    await expect(cards.first()).toContainText('a 350 m de Larcomar')
    await expect(page).toHaveURL(/cerca=larcomar.*orden=cercania/)

    await page.getByRole('radio', { name: /^Hasta 2 km/ }).check()
    await expect(cards).toHaveCount(6)
    await expect(page).toHaveURL(/cerca=larcomar&km=2/)

    // Se puede compartir: al recargar sigue igual
    await page.reload()
    await expect(cards).toHaveCount(6)
    await expect(cards.first()).toContainText('a 350 m de Larcomar')

    await page.getByRole('button', { name: 'Quitar filtro: Cerca de Larcomar (Miraflores)' }).click()
    await expect(page.locator('[data-results-count]')).toHaveText('36 resultados')
    await expect(page.getByLabel('Ordenar por')).toHaveValue('destacados')
    await expect(cards.first().locator('[data-distance]')).toBeHidden()
    expect(page.url()).not.toMatch(/cerca=|km=|orden=/)
  })

  test('"Más cercanos" usa la ubicación del navegador sin ponerla en la URL', async ({ page, context }) => {
    await context.grantPermissions(['geolocation'])
    await context.setGeolocation({ latitude: -12.0853, longitude: -77.037 }) // Lince
    await page.goto('/capital/inmuebles')
    await page.getByLabel('Ordenar por').selectOption('cercania')
    const cards = page.locator('[data-results] [data-property-card]:visible')
    await expect(cards.first()).toContainText('Av. Petit Thouars cuadra 27')
    await expect(cards.first()).toContainText('a 450 m de ti')
    await expect(page.getByLabel('Ordenar por')).toHaveValue('cercania')
    expect(page.url()).not.toMatch(/cerca=|-12\.0/)
  })

  test('sin permiso de ubicación, avisa y lleva a elegir un lugar', async ({ page }) => {
    await page.addInitScript(() => {
      navigator.geolocation.getCurrentPosition = (_ok, fail) =>
        fail?.({ code: 1, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3, message: '' })
    })
    await page.goto('/capital/inmuebles')
    await page.getByLabel('Ordenar por').selectOption('cercania')
    await expect(page.getByText('No tenemos permiso para usar tu ubicación.')).toBeVisible()
    await expect(page.getByLabel('Ordenar por')).toHaveValue('destacados')
    await page.getByRole('button', { name: 'Elegir un lugar' }).click()
    await expect(page.getByLabel('O elige un lugar')).toBeFocused()
  })

  test('la vista de mapa muestra un pin por inmueble y su mini tarjeta', async ({ page }) => {
    // Sin descargar mosaicos de OpenStreetMap en las pruebas
    await page.route('https://tile.openstreetmap.org/**', (route) => route.abort())
    await page.goto('/capital/inmuebles?distrito=miraflores')
    const cards = page.locator('[data-results] [data-property-card]:visible')
    const count = await cards.count()
    expect(count).toBeGreaterThan(1)

    await page.getByRole('button', { name: 'Mapa', exact: true }).click()
    await expect(page).toHaveURL(/distrito=miraflores.*vista=mapa/)
    await expect(page.getByRole('button', { name: 'Mapa', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(page.locator('[data-results]')).toBeHidden()
    const pins = page.locator('.map-pin')
    await expect(pins).toHaveCount(count)

    await pins.first().click()
    const popup = page.locator('.leaflet-popup')
    await expect(popup).toContainText('Miraflores')
    await expect(popup.getByRole('link', { name: 'Ver más detalle' })).toHaveAttribute(
      'href',
      /\/capital\/miraflores-/,
    )

    // Los filtros también cambian el mapa, y al recargar sigue en el mapa
    await page.reload()
    await expect(pins).toHaveCount(count)
    await page.getByRole('button', { name: 'Quitar filtro: Miraflores' }).click()
    await expect(pins).toHaveCount(36)

    // El mapa lleva todos los pines; la lista, de 12 en 12
    await page.getByRole('button', { name: 'Lista', exact: true }).click()
    await expect(cards).toHaveCount(12)
    expect(page.url()).not.toContain('vista=')
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

  test('en móvil los filtros se abren en un panel', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/capital/inmuebles?distrito=brena')
    await expect(page.locator('[data-results] [data-property-card]:visible')).toHaveCount(1)
    await page.getByRole('button', { name: /Filtros/ }).click()
    await expect(page.getByRole('checkbox', { name: /Breña/ })).toBeChecked()
    await page.getByRole('button', { name: 'Ver 1 resultado' }).click()
    await expect(page.getByRole('checkbox', { name: /Breña/ })).toBeHidden()
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
