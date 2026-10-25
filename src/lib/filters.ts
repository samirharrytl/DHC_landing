// Búsqueda y filtros de depas. Funciones puras: se usan en el build y en el navegador,
// y se prueban con Vitest (tests/unit/filters.test.ts).
import { formatPEN, normalizeText } from './format'

export interface PropertyFilters {
  district?: string // slug del distrito
  maxPrice?: number // en soles
  minYield?: number // rentabilidad mínima anual, en %
}

/** Lo mínimo que necesita el filtro. En el navegador se arma con los data-* de cada tarjeta. */
export interface FilterableProperty {
  districtSlug: string
  price: number
  yieldMin: number
  searchText: string
}

export type FastFilterKind = 'district' | 'maxPrice' | 'minYield'
export interface FastFilter {
  label: string
  kind: FastFilterKind
  value: string
}

interface PropertyLike {
  district: { name: string; slug: string }
  address: string
  badge?: string | null
  developer?: { name: string } | null
  price: { amount: number }
  yield: { min: number; max: number }
}

/** Texto por el que se busca una tarjeta: distrito, dirección, inmobiliaria, badge y precio en varios formatos. */
export function buildSearchText(p: PropertyLike): string {
  return normalizeText(
    [
      p.district.name,
      p.address,
      p.developer?.name ?? '',
      p.badge ?? '',
      p.price.amount,
      formatPEN(p.price.amount),
    ].join(' '),
  )
}

export function toFilterable(p: PropertyLike): FilterableProperty {
  return {
    districtSlug: p.district.slug,
    price: p.price.amount,
    yieldMin: p.yield.min,
    searchText: buildSearchText(p),
  }
}

export function matchesFilters(p: FilterableProperty, query: string, filters: PropertyFilters): boolean {
  const q = normalizeText(query)
  if (q && !p.searchText.includes(q)) return false
  if (filters.district && p.districtSlug !== filters.district) return false
  if (filters.maxPrice != null && p.price > filters.maxPrice) return false
  if (filters.minYield != null && p.yieldMin < filters.minYield) return false
  return true
}

/** Convierte los filtros activos de la UI (kind → value en texto) en PropertyFilters. */
export function parseFilters(active: Iterable<[string, string]>): PropertyFilters {
  const filters: PropertyFilters = {}
  for (const [kind, value] of active) {
    if (kind === 'district') filters.district = value
    if (kind === 'maxPrice' && Number.isFinite(Number(value))) filters.maxPrice = Number(value)
    if (kind === 'minYield' && Number.isFinite(Number(value))) filters.minYield = Number(value)
  }
  return filters
}

const PRICE_STEP = 50_000

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2
}
/** El candidato más cercano a la mediana; a igual distancia, el mayor. */
const closestTo = (target: number, candidates: number[]) =>
  [...candidates].sort((a, b) => Math.abs(a - target) - Math.abs(b - target) || b - a)[0]

/**
 * Pocos filtros rápidos y relevantes, derivados de los datos (no escritos a mano):
 * - los distritos con más depas (a igualdad, los de mejor rentabilidad)
 * - un tope de precio redondeado a S/ 50,000, cerca de la mediana, que deja fuera al menos un depa
 * - una rentabilidad mínima, cerca de la mediana, que deja fuera al menos un depa
 * El resto de filtros está en "Todos los depas" (/capital/depas).
 */
export function buildFastFilters(properties: PropertyLike[], max = { districts: 4 }): FastFilter[] {
  if (properties.length === 0) return []

  const districts = new Map<string, { name: string; count: number; yieldSum: number }>()
  for (const p of properties) {
    const d = districts.get(p.district.slug) ?? { name: p.district.name, count: 0, yieldSum: 0 }
    d.count += 1
    d.yieldSum += (p.yield.min + p.yield.max) / 2
    districts.set(p.district.slug, d)
  }
  const districtFilters = [...districts]
    .sort(
      ([, a], [, b]) =>
        b.count - a.count ||
        b.yieldSum / b.count - a.yieldSum / a.count ||
        a.name.localeCompare(b.name, 'es'),
    )
    .slice(0, max.districts)
    .map(([slug, d]) => ({ label: d.name, kind: 'district' as const, value: slug }))

  const prices = properties.map((p) => p.price.amount)
  const highest = Math.max(...prices)
  const ceilings = [...new Set(prices.map((n) => Math.ceil(n / PRICE_STEP) * PRICE_STEP))].filter(
    (ceiling) => ceiling < highest,
  )
  const ceiling = closestTo(median(prices), ceilings)
  const priceFilters =
    ceiling === undefined
      ? []
      : [{ label: `Hasta ${formatPEN(ceiling)}`, kind: 'maxPrice' as const, value: String(ceiling) }]

  const yieldMins = properties.map((p) => p.yield.min)
  const lowestYield = Math.min(...yieldMins)
  const minYield = closestTo(
    median(yieldMins),
    [...new Set(yieldMins)].filter((y) => y > lowestYield),
  )
  const yieldFilters =
    minYield === undefined
      ? []
      : [{ label: `Desde ${minYield}% anual`, kind: 'minYield' as const, value: String(minYield) }]

  return [...districtFilters, ...priceFilters, ...yieldFilters]
}
