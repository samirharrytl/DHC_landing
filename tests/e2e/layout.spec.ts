import { expect, test } from './fixtures'

test('El footer queda pegado al pie de la pantalla cuando la página es corta', async ({ page }) => {
  // Una pantalla muy alta hace que cualquier página quede corta, en escritorio y en móvil
  const height = 2000
  await page.setViewportSize({ width: page.viewportSize()?.width ?? 1280, height })
  await page.goto('/registro/gracias')

  const box = await page.locator('footer.footer').boundingBox()
  if (!box) throw new Error('No se ve el footer')
  expect(box.y + box.height).toBeCloseTo(height, 0)
})
