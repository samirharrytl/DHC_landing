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

/** { min: 8, max: 10 } → "8–10% anual" · { min: 8, max: 8 } → "8% anual" */
export function formatYield({ min, max }: { min: number; max: number }): string {
  return min === max ? `${min}% anual` : `${min}–${max}% anual`
}

/** 11 → "11 años" · 1 → "1 año" */
export const formatYears = (years: number) => `${years} ${years === 1 ? 'año' : 'años'}`

/** Datos físicos del depa que existan: ["2 dorm.", "2 baños", "68 m²"] */
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

/** Nota que va debajo de cada grid de depas. Los supuestos que falten se muestran como [campo]. */
export function buildDisclaimer(f: {
  rate: number | null
  downPaymentPct: number | null
  termYears: number | null
  asOf: string | null
}): string {
  const term = f.termYears ?? '[plazo]'
  const down = f.downPaymentPct ?? '[X]'
  const date = f.asOf ? formatDate(f.asOf) : '[fecha]'
  const rate = f.rate != null ? ` de ${f.rate}%` : ''
  return (
    `*Cuota estimada con tasa pizarra${rate} a ${term} años y ${down} % de inicial, al ${date}. ` +
    'Renta estimada según el mercado del distrito. No es una rentabilidad garantizada.'
  )
}
