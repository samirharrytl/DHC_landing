import { expect, mockApi, test } from './fixtures'

test('Propietarios: muestra los errores por campo que devuelve la API', async ({ page }) => {
  await mockApi(page, '/v1/leads', 400, {
    statusCode: 400,
    error: 'Bad Request',
    message: 'Revisa los datos enviados',
    issues: [{ path: 'email', message: 'Correo inválido según la API' }],
  })
  await page.goto('/propietarios')
  const form = page.locator('[data-owner-form]')
  await form.getByLabel('Nombre').fill('Luis')
  await form.getByLabel('Celular').fill('987 654 321')
  await form.getByLabel(/Correo/).fill('luis@example.com')
  await form.getByLabel('Distrito').selectOption('Lince')
  await form.getByLabel('Tipo').selectOption('Departamento')
  await form.getByLabel('Qué quieres hacer').selectOption('sell')
  await form.getByRole('checkbox').check()
  await form.getByRole('button', { name: /Recibir propuesta/ }).click()
  await expect(form.getByText('Correo inválido según la API')).toBeVisible()
  await expect(form.getByLabel(/Correo/)).toHaveAttribute('aria-invalid', 'true')
})

test('Libro de Reclamaciones: registra y muestra el código', async ({ page }) => {
  const received = await mockApi(page, '/v1/complaints', 201, {
    code: 'LR-2026-000001',
    createdAt: new Date().toISOString(),
    responseDeadline: '2026-11-09',
  })
  await page.goto('/libro-de-reclamaciones')
  await page.getByLabel('Nombres').fill('Ana')
  await page.getByLabel('Apellidos').fill('Quispe')
  await page.getByLabel('Número de documento').fill('45678912')
  await page.getByLabel('Domicilio').fill('Jr. Las Flores 123, Lince')
  await page.getByLabel('Teléfono').fill('987654321')
  await page.getByLabel('Correo electrónico').fill('ana@example.com')
  await page.getByLabel('Descripción').fill('Estadía de 3 noches')
  await page.getByLabel('Detalle').fill('El departamento no tenía agua caliente.')
  await page.getByLabel('Pedido').fill('Devolución de una noche.')
  await page.getByLabel(/Acepto que mis datos/).check()
  await page.getByRole('button', { name: 'Enviar reclamo' }).click()

  await expect(page.getByText('LR-2026-000001')).toBeVisible()
  await expect(page.getByText('9 de noviembre de 2026')).toBeVisible()
  await expect(page.getByText('Enviando…')).toBeHidden()
  expect(received[0]).toMatchObject({
    consumer: { firstName: 'Ana', documentType: 'DNI', isMinor: false },
    item: { type: 'servicio', description: 'Estadía de 3 noches' },
    kind: 'reclamo',
    consent: true,
  })
})

test('Propietarios: "Quiero vender" elige la opción y envía el lead', async ({ page }) => {
  const received = await mockApi(page, '/v1/leads', 201, {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  })
  await page.goto('/propietarios')
  await page.getByRole('button', { name: 'Quiero vender' }).click()
  const form = page.locator('[data-owner-form]')
  await expect(form.getByLabel('Qué quieres hacer')).toHaveValue('sell')
  await expect(form.getByLabel('Nombre')).toBeFocused()
  await form.getByLabel('Nombre').fill('Luis')
  await form.getByLabel('Celular').fill('987 654 321')
  await form.getByLabel('Distrito').selectOption('Lince')
  await form.getByLabel('Tipo').selectOption('Departamento')
  await form.getByLabel(/Precio esperado/).fill('250,000')
  await form.getByRole('checkbox').check()
  await form.getByRole('button', { name: /Recibir propuesta/ }).click()
  await expect(form.getByRole('status')).toContainText('Te escribimos por WhatsApp')
  expect(received[0]).toMatchObject({
    source: 'owner-sell',
    details: { district: 'Lince', propertyType: 'Departamento', intent: 'sell', expectedPrice: 250000 },
  })
})

test('Propietarios: #alquiler preselecciona alquilar', async ({ page }) => {
  await page.goto('/propietarios#alquiler')
  await expect(page.locator('[data-owner-form]').getByLabel('Qué quieres hacer')).toHaveValue('rent')
  await expect(page.getByText('Alquiler mensual esperado')).toBeVisible()
})

test('banner de cookies: aparece la primera vez y recuerda la elección', async ({ browser }) => {
  const page = await browser.newPage()
  await page.goto('/')
  const banner = page.getByRole('region', { name: 'Usamos cookies de analítica' })
  await expect(banner).toBeVisible()
  await banner.getByRole('button', { name: 'Rechazar' }).click()
  await expect(banner).toBeHidden()
  await page.reload()
  await expect(banner).toBeHidden()
  await page.getByRole('button', { name: 'Preferencias de cookies' }).click()
  await expect(banner).toBeVisible()
  await page.close()
})
