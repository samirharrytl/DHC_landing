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
  it('arma pocos chips: distritos con más depas y un tope útil de precio y de rentabilidad', () => {
    const filters = buildFastFilters([lince, surquillo, magdalena])
    // A igual cantidad de depas, primero los de mejor rentabilidad
    expect(filters.filter((f) => f.kind === 'district').map((f) => f.label)).toEqual([
      'Surquillo',
      'Lince',
      'Magdalena',
    ])
    // 350,000 incluiría a todos: no se ofrece
    expect(filters.filter((f) => f.kind === 'maxPrice').map((f) => f.value)).toEqual(['300000'])
    // 7% es el mínimo: no se ofrece; 8% es el más cercano a la mediana
    expect(filters.filter((f) => f.kind === 'minYield').map((f) => f.value)).toEqual(['8'])
  })

  it('muestra solo los distritos con más depas', () => {
    const many = [
      make('Lince', 300000, 8),
      make('Lince', 320000, 8),
      make('Barranco', 400000, 9),
      make('Barranco', 410000, 9),
      make('Barranco', 420000, 9),
      make('Miraflores', 500000, 7),
      make('Surquillo', 280000, 10),
      make('Breña', 250000, 6),
      make('Rímac', 230000, 5),
    ]
    const districts = buildFastFilters(many)
      .filter((f) => f.kind === 'district')
      .map((f) => f.label)
    expect(districts).toEqual(['Barranco', 'Lince', 'Surquillo', 'Miraflores'])
  })

  it('no devuelve nada sin depas', () => {
    expect(buildFastFilters([])).toEqual([])
  })
})
