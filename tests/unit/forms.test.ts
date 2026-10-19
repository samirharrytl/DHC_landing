// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { formToObject } from '../../src/scripts/forms'

describe('formToObject', () => {
  it('arma JSON anidado con tipos y omite vacíos y deshabilitados', () => {
    document.body.innerHTML = `
      <form>
        <input name="consumer.firstName" value=" Ana ">
        <input name="consumer.email" value="">
        <input name="consumer.isMinor" type="checkbox">
        <input name="consumer.guardianName" value="X" disabled>
        <input name="item.amount" type="number" value="450.5">
        <input name="amountUsd" data-number value="50,000">
        <input name="kind" type="radio" value="reclamo">
        <input name="kind" type="radio" value="queja" checked>
        <input name="consent" type="checkbox" checked>
        <textarea name="detail">Detalle</textarea>
        <input name="cf-turnstile-response" type="hidden" value="tok">
      </form>`
    expect(formToObject(document.querySelector('form')!)).toEqual({
      consumer: { firstName: 'Ana', isMinor: false },
      item: { amount: 450.5 },
      amountUsd: 50000,
      kind: 'queja',
      consent: true,
      detail: 'Detalle',
      turnstileToken: 'tok',
    })
  })
})
