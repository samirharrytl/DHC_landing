import { describe, expect, it } from 'vitest'
import { buildFastFilters, matchesFilters, parseFilters, toFilterable } from '../../src/lib/filters'

const make = (district: string, amount: number, min: number, max = min + 2) => ({
  district: { name: district, slug: district.toLowerCase() },
  address: `Av. Principal ${amount}`,
  badge: 'Súper precio',
  price: { amount },
  yield: { min, max },
})

const lince = make('Lince', 310000, 8)
const surquillo = make('Surquillo', 285000, 9)
const magdalena = make('Magdalena', 340000, 7)

describe('matchesFilters', () => {
  it('busca por distrito, dirección y precio ignorando tildes y formato', () => {
    const p = toFilterable(lince)
    expect(matchesFilters(p, 'LINCE', {})).toBe(true)
    expect(matchesFilters(p, 'principal', {})).toBe(true)
    expect(matchesFilters(p, '310 000', {})).toBe(true)
    expect(matchesFilters(p, 'S/ 310,000', {})).toBe(true)
    expect(matchesFilters(p, 'miraflores', {})).toBe(false)
  })

  it('combina distrito, precio máximo y rentabilidad mínima', () => {
    const p = toFilterable(lince)
    expect(matchesFilters(p, '', { district: 'lince', maxPrice: 310000, minYield: 8 })).toBe(true)
    expect(matchesFilters(p, '', { district: 'surquillo' })).toBe(false)
    expect(matchesFilters(p, '', { maxPrice: 300000 })).toBe(false)
    expect(matchesFilters(p, '', { minYield: 9 })).toBe(false)
  })

  it('convierte los filtros activos de la UI', () => {
    expect(
      parseFilters([
        ['district', 'lince'],
        ['maxPrice', '300000'],
        ['minYield', '8'],
        ['otro', 'x'],
      ]),
    ).toEqual({ district: 'lince', maxPrice: 300000, minYield: 8 })
  })
})

describe('buildFastFilters', () => {
  it('arma chips de distrito ordenados y topes útiles', () => {
    const filters = buildFastFilters([lince, surquillo, magdalena])
    expect(filters.filter((f) => f.kind === 'district').map((f) => f.label)).toEqual([
      'Lince',
      'Magdalena',
      'Surquillo',
    ])
    // 350,000 incluiría a todos: no se ofrece
    expect(filters.filter((f) => f.kind === 'maxPrice').map((f) => f.value)).toEqual(['300000'])
    // 7% es el mínimo: no se ofrece
    expect(filters.filter((f) => f.kind === 'minYield').map((f) => f.value)).toEqual(['8', '9'])
  })

  it('no devuelve nada sin depas', () => {
    expect(buildFastFilters([])).toEqual([])
  })
})
