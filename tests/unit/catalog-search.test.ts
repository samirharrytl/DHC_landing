import { describe, expect, it } from 'vitest'
import {
  emptyQuery,
  hasFilters,
  matchesQuery,
  paybackSteps,
  priceRanges,
  queryFromParams,
  queryToParams,
  sortDepas,
  yieldSteps,
  type SearchableDepa,
} from '../../src/lib/catalog-search'
import { formatPEN, normalizeText } from '../../src/lib/format'

let order = 0
const make = (over: Partial<SearchableDepa>): SearchableDepa => ({
  id: String(order),
  districtSlug: 'lince',
  origin: 'owner',
  developerSlug: null,
  price: 300_000,
  yieldMin: 8,
  yieldMax: 10,
  paybackYears: 11,
  status: 'published',
  searchText: normalizeText('Lince Av. Arequipa'),
  order: order++,
  ...over,
})

const lince = make({})
const surquillo = make({
  districtSlug: 'surquillo',
  price: 285_000,
  yieldMin: 9,
  yieldMax: 11,
  paybackYears: 10,
})
const miraflores = make({
  districtSlug: 'miraflores',
  origin: 'developer',
  developerSlug: 'urbana',
  price: 789_000,
  yieldMin: 6.2,
  yieldMax: 6.2,
  paybackYears: 16,
  status: 'reserved',
  searchText: normalizeText('Miraflores Calle Schell Urbana'),
})
const all = [lince, surquillo, miraflores]

describe('matchesQuery', () => {
  const only = (over: Partial<ReturnType<typeof emptyQuery>>) =>
    all.filter((d) => matchesQuery(d, { ...emptyQuery(), ...over })).map((d) => d.districtSlug)

  it('sin filtros trae todo', () => {
    expect(only({})).toEqual(['lince', 'surquillo', 'miraflores'])
  })
  it('combina facetas: varios valores del mismo grupo suman, grupos distintos restringen', () => {
    expect(only({ districts: ['lince', 'miraflores'] })).toEqual(['lince', 'miraflores'])
    expect(only({ districts: ['lince', 'miraflores'], origins: ['developer'] })).toEqual(['miraflores'])
    expect(only({ developers: ['urbana'] })).toEqual(['miraflores'])
  })
  it('precio, rentabilidad mínima, plazo y disponibilidad', () => {
    expect(only({ minPrice: 290_000, maxPrice: 400_000 })).toEqual(['lince'])
    expect(only({ minYield: 9 })).toEqual(['surquillo'])
    expect(only({ maxPayback: 12 })).toEqual(['lince', 'surquillo'])
    expect(only({ available: true })).toEqual(['lince', 'surquillo'])
  })
  it('busca todas las palabras, sin importar tildes ni mayúsculas', () => {
    expect(only({ q: 'Schell URBANA' })).toEqual(['miraflores'])
    expect(only({ q: 'schell lince' })).toEqual([])
  })
  it('para contar opciones ignora el grupo que se cuenta', () => {
    const query = { ...emptyQuery(), districts: ['lince'] }
    expect(matchesQuery(surquillo, query)).toBe(false)
    expect(matchesQuery(surquillo, query, 'district')).toBe(true)
  })
})

describe('sortDepas', () => {
  const slugs = (list: SearchableDepa[]) => list.map((d) => d.districtSlug)
  it('ordena por precio, rentabilidad y plazo; "Destacados" respeta el orden original', () => {
    expect(slugs(sortDepas([miraflores, lince, surquillo], 'destacados'))).toEqual([
      'lince',
      'surquillo',
      'miraflores',
    ])
    expect(slugs(sortDepas(all, 'precio-asc'))).toEqual(['surquillo', 'lince', 'miraflores'])
    expect(slugs(sortDepas(all, 'precio-desc'))).toEqual(['miraflores', 'lince', 'surquillo'])
    expect(slugs(sortDepas(all, 'rentabilidad'))).toEqual(['surquillo', 'lince', 'miraflores'])
    expect(slugs(sortDepas(all, 'plazo'))).toEqual(['surquillo', 'lince', 'miraflores'])
  })
})

describe('URL', () => {
  it('ida y vuelta con todos los filtros', () => {
    const query = {
      ...emptyQuery(),
      q: 'av arequipa',
      origins: ['owner'],
      districts: ['lince', 'surquillo'],
      minPrice: 300_000,
      minYield: 8,
      maxPayback: 12,
      available: true,
      sort: 'precio-asc' as const,
    }
    const params = queryToParams(query)
    expect(params.toString()).toBe(
      'q=av+arequipa&tipo=owner&distrito=lince%2Csurquillo&min=300000&rentabilidad=8&plazo=12&disponibles=1&orden=precio-asc',
    )
    expect(queryFromParams(params)).toMatchObject({ ...query, maxPrice: undefined })
  })
  it('ignora valores inválidos', () => {
    const query = queryFromParams(new URLSearchParams('min=abc&plazo=-3&orden=hackeado'))
    expect(query.minPrice).toBeUndefined()
    expect(query.maxPayback).toBeUndefined()
    expect(query.sort).toBe('destacados')
  })
  it('el orden no cuenta como filtro', () => {
    expect(hasFilters({ ...emptyQuery(), sort: 'plazo' })).toBe(false)
    expect(hasFilters({ ...emptyQuery(), districts: ['lince'] })).toBe(true)
  })
})

describe('opciones de las facetas', () => {
  it('tramos de precio solo con depas', () => {
    const ranges = priceRanges([285_000, 310_000, 789_000], formatPEN)
    expect(ranges.map((r) => r.label)).toEqual([
      `Hasta ${formatPEN(300_000)}`,
      `${formatPEN(300_000)} a ${formatPEN(400_000)}`,
      `${formatPEN(700_000)} a ${formatPEN(1_000_000)}`,
    ])
  })
  it('escalones de rentabilidad y plazo que separan a los depas', () => {
    expect(yieldSteps([8, 9, 7, 5.8, 6.2, 5.6])).toEqual([6, 7, 8, 9])
    expect(paybackSteps([11, 10, 12, 17, 16, 18])).toEqual([10, 12, 14, 16])
  })
})
