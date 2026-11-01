// Datos de un inmueble en columnas, para la tarjeta y el detalle: dormitorios y baños juntos, área y
// antigüedad (lo que falte no se muestra). Funciones puras: se prueban con Vitest (tests/unit/facts.test.ts).
import { formatAge } from './format'
import type { IconName } from './icons'

export interface FactPart {
  icon: IconName
  value: string
  /** Solo para lectores de pantalla: "2 2 dorm. y baños" no se entiende sin los íconos */
  name?: string
}

/** Una columna de FactRow: uno o más valores con ícono y, debajo, qué son */
export interface Fact {
  parts: FactPart[]
  label: string
  /** Valor en verde (rentabilidad) */
  positive?: boolean
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

export function propertyFacts(
  p: {
    bedrooms?: number | null
    bathrooms?: number | null
    areaM2?: number | null
    yearBuilt?: number | null
  },
  currentYear?: number,
): Fact[] {
  const facts: Fact[] = []
  const { bedrooms: beds, bathrooms: baths } = p
  if (beds != null && baths != null)
    facts.push({
      parts: [
        { icon: 'bed', value: String(beds), name: plural(beds, 'dormitorio', 'dormitorios') },
        { icon: 'bath', value: String(baths), name: plural(baths, 'baño', 'baños') },
      ],
      label: 'dorm. y baños',
    })
  else if (beds != null)
    facts.push({
      parts: [{ icon: 'bed', value: String(beds) }],
      label: plural(beds, 'dormitorio', 'dormitorios'),
    })
  else if (baths != null)
    facts.push({ parts: [{ icon: 'bath', value: String(baths) }], label: plural(baths, 'baño', 'baños') })
  if (p.areaM2 != null) facts.push({ parts: [{ icon: 'area', value: `${p.areaM2} m²` }], label: 'área' })
  if (p.yearBuilt != null) {
    const age = formatAge(p.yearBuilt, currentYear)
    facts.push({ parts: [{ icon: 'building', value: age.value }], label: age.label })
  }
  return facts
}
