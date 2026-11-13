// Formatos de texto compartidos por páginas, componentes y scripts del navegador.

const formatters = new Map<string, Intl.NumberFormat>()

/** 310000 → "S/ 310,000" · 50000 USD → "US$ 50,000" */
export function formatMoney(amount: number, currency: 'PEN' | 'USD' = 'PEN'): string {
  let formatter = formatters.get(currency)
  if (!formatter) {
    formatter = new Intl.NumberFormat('es-PE', { style: 'currency', currency, maximumFractionDigits: 0 })
    formatters.set(currency, formatter)
  }
  return formatter.format(amount)
}

export const formatPEN = (amount: number) => formatMoney(amount, 'PEN')

/** Precio corto para los pines del mapa: 310000 → "S/ 310k" · 1250000 → "S/ 1.3M" */
export function formatPENShort(amount: number): string {
  if (amount >= 1_000_000) return `S/ ${(Math.round(amount / 100_000) / 10).toString()}M`
  return `S/ ${Math.round(amount / 1000)}k`
}

/** { min: 8, max: 10 } → "8–10% anual" · { min: 8, max: 8 } → "8% anual" · null (sin dato) → "" */
export function formatYield(y: { min: number; max: number } | null): string {
  if (!y) return ''
  return y.min === y.max ? `${y.min}% anual` : `${y.min}–${y.max}% anual`
}

/** Alquiler mensual que da la rentabilidad estimada (renta anual ÷ precio), redondeado a 10:
 *  S/ 310,000 al 8–10% anual → "S/ 2,070–2,580" · USD 150,000 al 7% → "USD 880" */
export function formatMonthlyRent(
  amount: number,
  { min, max }: { min: number; max: number },
  currency: 'PEN' | 'USD' = 'PEN',
): string {
  const monthly = (rate: number) => Math.round((amount * rate) / 1200 / 10) * 10
  const [low, high] = [monthly(min), monthly(max)]
  return low === high
    ? formatMoney(low, currency)
    : `${formatMoney(low, currency)}–${high.toLocaleString('es-PE')}`
}

/** 11 → "11 años" · 1 → "1 año" */
export const formatYears = (years: number | null) =>
  years === null ? '' : `${years} ${years === 1 ? 'año' : 'años'}`

/** Calle sin la cuadra, para títulos: "Av. Arequipa cuadra 12" → "Av. Arequipa" */
export const streetOf = (address: string) => address.replace(/ cuadra \d+$/i, '')

/** Antigüedad (en 2026): 2018 → "8 años" de antigüedad · 2026 → "Nuevo" · 2027, un proyecto por entregar →
 *  "2027" de entrega. text es la frase para listas: "8 años de antigüedad" · "A estrenar" · "Entrega 2027" */
export function formatAge(yearBuilt: number, currentYear = new Date().getFullYear()) {
  if (yearBuilt > currentYear)
    return { value: String(yearBuilt), label: 'entrega', text: `Entrega ${yearBuilt}` }
  const age = currentYear - yearBuilt
  return age === 0
    ? { value: 'Nuevo', label: 'antigüedad', text: 'A estrenar' }
    : { value: formatYears(age), label: 'antigüedad', text: `${formatYears(age)} de antigüedad` }
}

/** Datos físicos del inmueble que existan: ["2 dorm.", "2 baños", "68 m²"] */
export function formatFacts(p: {
  bedrooms?: number | null
  bathrooms?: number | null
  areaM2?: number | null
}): string[] {
  const facts: string[] = []
  if (p.bedrooms != null) facts.push(`${p.bedrooms} dorm.`)
  if (p.bathrooms != null) facts.push(`${p.bathrooms} ${p.bathrooms === 1 ? 'baño' : 'baños'}`)
  if (p.areaM2 != null) facts.push(`${p.areaM2} m²`)
  return facts
}

/** "2026-10-08" → "8 de octubre de 2026". Una fecha sin hora se toma tal cual (no se corre por zona horaria). */
export function formatDate(iso: string): string {
  const instant = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00Z` : iso
  return new Intl.DateTimeFormat('es-PE', { dateStyle: 'long', timeZone: 'America/Lima' }).format(
    new Date(instant),
  )
}

/** Texto comparable: sin tildes, minúsculas y solo letras/números. "Magdalena, S/ 340,000" → "magdalenas340000" */
export const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

/** "Av. del Ejército" → "av-del-ejercito" */
export const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
