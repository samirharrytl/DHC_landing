import { describe, expect, it } from 'vitest'
import {
  buildDisclaimer,
  formatMoney,
  formatPEN,
  formatPENShort,
  formatYears,
  formatYield,
  normalizeText,
  slugify,
} from '../../src/lib/format'

describe('format', () => {
  it('formatea soles y dólares sin decimales', () => {
    // Intl separa el símbolo con un espacio no separable (U+00A0)
    expect(formatPEN(310000).replace(/\s/g, ' ')).toBe('S/ 310,000')
    expect(formatPENShort(310000)).toBe('S/ 310k')
    expect(formatPENShort(1_250_000)).toBe('S/ 1.3M')
    expect(formatPENShort(2_000_000)).toBe('S/ 2M')
    expect(formatMoney(50000, 'USD')).toMatch(/50,000/)
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

  it('muestra los supuestos faltantes del disclaimer como [campo]', () => {
    const empty = buildDisclaimer({ rate: null, downPaymentPct: null, termYears: null, asOf: null })
    expect(empty).toContain('a [plazo] años y [X] % de inicial, al [fecha]')
    const full = buildDisclaimer({ rate: 8.5, downPaymentPct: 10, termYears: 20, asOf: '2026-10-01' })
    expect(full).toContain('tasa pizarra de 8.5% a 20 años y 10 % de inicial, al 1 de octubre de 2026')
  })
})
