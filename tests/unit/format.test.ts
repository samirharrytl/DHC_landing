import { describe, expect, it } from 'vitest'
import {
  formatAge,
  formatMoney,
  formatMonthlyRent,
  formatPEN,
  formatPENShort,
  formatYears,
  formatYield,
  normalizeText,
  slugify,
  streetOf,
} from '../../src/lib/format'

describe('format', () => {
  it('deja la calle sin la cuadra', () => {
    expect(streetOf('Av. Arequipa cuadra 12')).toBe('Av. Arequipa')
    expect(streetOf('Calle Toulon 145')).toBe('Calle Toulon 145')
  })

  it('muestra la antigüedad, "Nuevo" este año y el año de entrega de un proyecto', () => {
    expect(formatAge(2018, 2026)).toEqual({
      value: '8 años',
      label: 'antigüedad',
      text: '8 años de antigüedad',
    })
    expect(formatAge(2025, 2026).text).toBe('1 año de antigüedad')
    expect(formatAge(2026, 2026)).toEqual({ value: 'Nuevo', label: 'antigüedad', text: 'A estrenar' })
    expect(formatAge(2027, 2026)).toEqual({ value: '2027', label: 'entrega', text: 'Entrega 2027' })
  })

  it('formatea soles y dólares sin decimales', () => {
    // Intl separa el símbolo con un espacio no separable (U+00A0)
    expect(formatPEN(310000).replace(/\s/g, ' ')).toBe('S/ 310,000')
    expect(formatPENShort(310000)).toBe('S/ 310k')
    expect(formatPENShort(1_250_000)).toBe('S/ 1.3M')
    expect(formatPENShort(2_000_000)).toBe('S/ 2M')
    expect(formatMoney(50000, 'USD')).toMatch(/50,000/)
  })

  it('calcula el alquiler mensual con la rentabilidad estimada', () => {
    expect(formatMonthlyRent(310_000, { min: 8, max: 10 }).replace(/\s/g, ' ')).toBe('S/ 2,070–2,580')
    expect(formatMonthlyRent(150_000, { min: 7, max: 7 }, 'USD').replace(/\s/g, ' ')).toBe('USD 880')
  })

  it('formatea rentabilidad y plazos', () => {
    expect(formatYield({ min: 8, max: 10 })).toBe('8–10% anual')
    expect(formatYield({ min: 8, max: 8 })).toBe('8% anual')
    expect(formatYears(11)).toBe('11 años')
    expect(formatYears(1)).toBe('1 año')
  })

  it('normaliza texto para buscar sin tildes ni símbolos', () => {
    expect(normalizeText('Av. del Ejército, S/ 340,000')).toBe('avdelejercitos340000')
    expect(slugify('Av. del Ejército cuadra 6')).toBe('av-del-ejercito-cuadra-6')
  })
})
