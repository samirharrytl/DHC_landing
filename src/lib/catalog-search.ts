// Búsqueda de "Todos los inmuebles" (/capital/inmuebles): filtros por facetas, orden y conteos, como en una
// tienda en línea. Funciones puras: las usa el navegador y se prueban con Vitest
// (tests/unit/catalog-search.test.ts). Los filtros viven en la URL para poder compartir la búsqueda.
import { normalizeText } from './format'
import { MY_LOCATION } from './geo'

/** Lo que necesita la búsqueda de cada inmueble. En el navegador se arma con los data-* de la tarjeta. */
export interface SearchableDepa {
  id: string
  districtSlug: string
  origin: 'owner' | 'developer'
  developerSlug: string | null
  price: number
  yieldMin: number
  yieldMax: number
  paybackYears: number
  status: 'published' | 'reserved' | 'sold'
  searchText: string
  /** Posición en el orden "Destacados" (destacados primero, luego los más nuevos) */
  order: number
  /** Distancia en km al punto elegido en "Cerca de" (sin punto o sin ubicación: undefined) */
  distanceKm?: number
}

export type SortKey = 'destacados' | 'precio-asc' | 'precio-desc' | 'rentabilidad' | 'plazo' | 'cercania'

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'destacados', label: 'Destacados' },
  { value: 'precio-asc', label: 'Precio: menor a mayor' },
  { value: 'precio-desc', label: 'Precio: mayor a menor' },
  { value: 'rentabilidad', label: 'Mayor rentabilidad' },
  { value: 'plazo', label: 'Se paga antes' },
  { value: 'cercania', label: 'Más cercanos' },
]

/** "Cerca de": hasta cuántos km del punto elegido */
export const DISTANCE_STEPS = [2, 5, 10]

export interface DepaQuery {
  q: string
  origins: string[]
  districts: string[]
  developers: string[]
  minPrice?: number
  maxPrice?: number
  minYield?: number
  maxPayback?: number
  /** Solo disponibles: deja fuera los reservados */
  available: boolean
  /** "Cerca de": slug de un lugar o distrito (src/data/lugares.ts) o "mi-ubicacion" */
  near?: string
  maxKm?: number
  sort: SortKey
}

/** Grupos de filtros. Para contar las opciones de un grupo se ignora ese mismo grupo. */
export type FacetGroup =
  'origin' | 'district' | 'developer' | 'price' | 'yield' | 'payback' | 'available' | 'distance'

export const emptyQuery = (): DepaQuery => ({
  q: '',
  origins: [],
  districts: [],
  developers: [],
  available: false,
  sort: 'destacados',
})

export function matchesQuery(d: SearchableDepa, query: DepaQuery, ignore?: FacetGroup): boolean {
  // Cada palabra por separado: "schell urbana" encuentra "Calle Schell … Urbana"
  const words = query.q.split(/\s+/).map(normalizeText).filter(Boolean)
  if (!words.every((word) => d.searchText.includes(word))) return false
  if (ignore !== 'origin' && query.origins.length && !query.origins.includes(d.origin)) return false
  if (ignore !== 'district' && query.districts.length && !query.districts.includes(d.districtSlug))
    return false
  if (ignore !== 'developer' && query.developers.length && !query.developers.includes(d.developerSlug ?? ''))
    return false
  if (ignore !== 'price') {
    if (query.minPrice != null && d.price < query.minPrice) return false
    if (query.maxPrice != null && d.price > query.maxPrice) return false
  }
  if (ignore !== 'yield' && query.minYield != null && d.yieldMin < query.minYield) return false
  if (ignore !== 'payback' && query.maxPayback != null && d.paybackYears > query.maxPayback) return false
  if (ignore !== 'available' && query.available && d.status !== 'published') return false
  if (
    ignore !== 'distance' &&
    query.near &&
    query.maxKm != null &&
    !(d.distanceKm != null && d.distanceKm <= query.maxKm)
  )
    return false
  return true
}

/** Ordena sin modificar la lista. A igualdad, se mantiene el orden "Destacados". */
export function sortDepas<T extends SearchableDepa>(list: T[], sort: SortKey): T[] {
  const by: Record<SortKey, (a: T, b: T) => number> = {
    destacados: () => 0,
    'precio-asc': (a, b) => a.price - b.price,
    'precio-desc': (a, b) => b.price - a.price,
    rentabilidad: (a, b) => b.yieldMax - a.yieldMax || b.yieldMin - a.yieldMin,
    plazo: (a, b) => a.paybackYears - b.paybackYears,
    // Los que no tienen ubicación van al final
    cercania: (a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity) || 0,
  }
  return [...list].sort((a, b) => by[sort](a, b) || a.order - b.order)
}

// ---------- URL ----------

const list = (value: string | null) => (value ? value.split(',').filter(Boolean) : [])
const text = (value: string | null) => (value === null || value === '' ? undefined : value)
const num = (value: string | null) => {
  if (value === null || value.trim() === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

export function queryFromParams(params: URLSearchParams): DepaQuery {
  const sort = params.get('orden')
  return {
    q: params.get('q') ?? '',
    origins: list(params.get('tipo')),
    districts: list(params.get('distrito')),
    developers: list(params.get('inmobiliaria')),
    minPrice: num(params.get('min')),
    maxPrice: num(params.get('max')),
    minYield: num(params.get('rentabilidad')),
    maxPayback: num(params.get('plazo')),
    available: params.get('disponibles') === '1',
    near: text(params.get('cerca')),
    maxKm: num(params.get('km')),
    sort: SORT_OPTIONS.find((o) => o.value === sort)?.value ?? 'destacados',
  }
}

export function queryToParams(query: DepaQuery): URLSearchParams {
  const params = new URLSearchParams()
  if (query.q.trim()) params.set('q', query.q.trim())
  if (query.origins.length) params.set('tipo', query.origins.join(','))
  if (query.districts.length) params.set('distrito', query.districts.join(','))
  if (query.developers.length) params.set('inmobiliaria', query.developers.join(','))
  if (query.minPrice != null) params.set('min', String(query.minPrice))
  if (query.maxPrice != null) params.set('max', String(query.maxPrice))
  if (query.minYield != null) params.set('rentabilidad', String(query.minYield))
  if (query.maxPayback != null) params.set('plazo', String(query.maxPayback))
  if (query.available) params.set('disponibles', '1')
  // La ubicación del navegador no va a la URL: es un dato de la persona y no se comparte con el link
  if (query.near && query.near !== MY_LOCATION) {
    params.set('cerca', query.near)
    if (query.maxKm != null) params.set('km', String(query.maxKm))
  }
  if (query.sort !== 'destacados') params.set('orden', query.sort)
  return params
}

/** ¿Hay algún filtro activo? (el orden no cuenta) */
export function hasFilters(query: DepaQuery): boolean {
  return queryToParams({ ...query, sort: 'destacados' }).size > 0
}

// ---------- Páginas ----------

/** Inmuebles por página: 12 llena las filas de 1, 2 y 3 columnas */
export const PAGE_SIZE = 12

export interface PageSlice {
  page: number
  pages: number
  /** Tramo de la lista que va en la página: list.slice(start, end) */
  start: number
  end: number
}

/** La página pedida dentro de las que hay (?pagina=9 con 3 páginas → la 3) y qué tramo de la lista muestra */
export function paginate(total: number, page: number, size = PAGE_SIZE): PageSlice {
  const pages = Math.max(1, Math.ceil(total / size))
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pages)
  const start = (current - 1) * size
  return { page: current, pages, start, end: Math.min(start + size, total) }
}

/** Números de la paginación: la primera, la última y las vecinas de la actual. null es "…". */
export function pageNumbers(page: number, pages: number): (number | null)[] {
  const shown = [...new Set([1, page - 1, page, page + 1, pages])]
    .filter((p) => p >= 1 && p <= pages)
    .sort((a, b) => a - b)
  const result: (number | null)[] = []
  let previous = 0
  for (const p of shown) {
    // Si solo falta un número, va el número: "1 2 3 4" en vez de "1 … 3 4"
    if (p - previous === 2) result.push(previous + 1)
    else if (p - previous > 2) result.push(null)
    result.push(p)
    previous = p
  }
  return result
}

// ---------- Opciones de las facetas (en el build) ----------

export interface RangeOption {
  label: string
  min?: number
  max?: number
}

const PRICE_EDGES = [300_000, 400_000, 500_000, 700_000, 1_000_000]

/** Tramos de precio con al menos un inmueble: "Hasta S/ 300,000", "S/ 300,000 a S/ 400,000"… */
export function priceRanges(prices: number[], format: (n: number) => string): RangeOption[] {
  const ranges = PRICE_EDGES.map((max, i): RangeOption => {
    const min = PRICE_EDGES[i - 1]
    return min === undefined
      ? { label: `Hasta ${format(max)}`, max }
      : { label: `${format(min)} a ${format(max)}`, min, max }
  })
  const top = Math.max(...PRICE_EDGES)
  ranges.push({ label: `Más de ${format(top)}`, min: top })
  return ranges.filter((range) =>
    prices.some((p) => (range.min == null || p >= range.min) && (range.max == null || p <= range.max)),
  )
}

/** "Desde 8% anual": un escalón por cada entero que deja fuera al menos un inmueble (mira el mínimo del rango). */
export function yieldSteps(yieldMins: number[]): number[] {
  const lowest = Math.min(...yieldMins)
  const highest = Math.max(...yieldMins)
  const steps: number[] = []
  for (let y = Math.floor(lowest) + 1; y <= Math.floor(highest); y++) steps.push(y)
  return steps
}

/** "Se paga en hasta 12 años": escalones de 2 en 2 que separan a los inmuebles. */
export function paybackSteps(years: number[]): number[] {
  const lowest = Math.min(...years)
  const highest = Math.max(...years)
  const steps: number[] = []
  for (let y = Math.ceil(lowest / 2) * 2; y < highest; y += 2) steps.push(y)
  return steps
}
