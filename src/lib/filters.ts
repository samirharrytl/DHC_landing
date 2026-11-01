// Búsqueda y filtros de inmuebles. Funciones puras: se usan en el build y en el navegador,
// y se prueban con Vitest (tests/unit/filters.test.ts).
import { formatPEN, normalizeText } from './format'

export interface PropertyFilters {
  district?: string // slug del distrito
  maxPrice?: number // en soles
}

/** Lo mínimo que necesita el filtro. En el navegador se arma con los data-* de cada tarjeta. */
export interface FilterableProperty {
  districtSlug: string
  price: number
  searchText: string
}

export type FastFilterKind = 'district' | 'maxPrice'
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
    searchText: buildSearchText(p),
  }
}

export function matchesFilters(p: FilterableProperty, query: string, filters: PropertyFilters): boolean {
  const q = normalizeText(query)
  if (q && !p.searchText.includes(q)) return false
  if (filters.district && p.districtSlug !== filters.district) return false
  if (filters.maxPrice != null && p.price > filters.maxPrice) return false
  return true
}

/** Convierte los filtros activos de la UI (kind → value en texto) en PropertyFilters. */
export function parseFilters(active: Iterable<[string, string]>): PropertyFilters {
  const filters: PropertyFilters = {}
  for (const [kind, value] of active) {
    if (kind === 'district') filters.district = value
    if (kind === 'maxPrice' && Number.isFinite(Number(value))) filters.maxPrice = Number(value)
  }
  return filters
}

const PRICE_STEP = 50_000

// Con largo impar, lower y upper son el mismo elemento
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b)
  const lower = sorted[Math.ceil(sorted.length / 2) - 1] ?? 0
  const upper = sorted[Math.floor(sorted.length / 2)] ?? 0
  return (lower + upper) / 2
}
/** El candidato más cercano a la mediana; a igual distancia, el mayor. */
const closestTo = (target: number, candidates: number[]) =>
  [...candidates].sort((a, b) => Math.abs(a - target) - Math.abs(b - target) || b - a)[0]

/**
 * Pocos filtros rápidos y relevantes, derivados de los datos (no escritos a mano):
 * - los distritos con más inmuebles (a igualdad, los de mejor rentabilidad)
 * - un tope de precio redondeado a S/ 50,000, cerca de la mediana, que deja fuera al menos un inmueble
 * La rentabilidad no va como filtro rápido: está con el resto de filtros en "Todos los inmuebles" (/capital/inmuebles).
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

  return [...districtFilters, ...priceFilters]
}
