// Distancias para "Cerca de" en Todos los depas (/capital/depas). Cada depa usa su ubicación exacta
// (location) si la tiene y, si no, el centro de su distrito (src/data/lugares.ts).
// Funciones puras: se prueban en tests/unit/geo.test.ts.
import { DISTRITOS, LUGARES, type Lugar } from '../data/lugares'

export interface Point {
  lat: number
  lng: number
}

/** Punto elegido en "Cerca de" con la geolocalización del navegador. No se guarda en la URL. */
export const MY_LOCATION = 'mi-ubicacion'

const toRad = (deg: number) => (deg * Math.PI) / 180

/** Distancia en línea recta, en km (fórmula de haversine) */
export function distanceKm(a: Point, b: Point): number {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

const districtsBySlug = new Map<string, Lugar>()
for (const d of DISTRITOS) for (const slug of [d.slug, ...(d.aliases ?? [])]) districtsBySlug.set(slug, d)

/** Centro de un distrito por su slug (acepta variantes como "magdalena" o "surco") */
export const districtCenter = (slug: string): Lugar | undefined => districtsBySlug.get(slug)

const places = new Map<string, Lugar>()
for (const group of LUGARES) for (const place of group.places) places.set(place.slug, place)
for (const d of DISTRITOS) places.set(d.slug, d)

/** Un lugar o distrito de la lista de "Cerca de", por su slug (el de la URL: ?cerca=larcomar) */
export const placeBySlug = (slug: string): Lugar | undefined => places.get(slug)

/** Dónde está un depa: su ubicación exacta o, si no la tiene, el centro de su distrito */
export function depaPosition(p: {
  location?: Point | null
  district: { slug: string }
}): (Point & { exact: boolean }) | undefined {
  if (p.location) return { lat: p.location.lat, lng: p.location.lng, exact: true }
  const center = districtCenter(p.district.slug)
  return center ? { lat: center.lat, lng: center.lng, exact: false } : undefined
}

/** ¿El punto está en Lima? (para no ordenar desde otro país con la ubicación del navegador) */
export const isNearLima = (point: Point) => distanceKm(point, { lat: -12.06, lng: -77.04 }) <= 80

const oneDecimal = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 1 })

/**
 * "a 350 m", "a 1.2 km", "a 14 km". Si la ubicación es la del centro del distrito,
 * la cifra se redondea: "a menos de 2 km", "a unos 5 km".
 */
export function formatDistance(km: number, exact: boolean): string {
  if (!exact) return km < 1.5 ? 'a menos de 2 km' : `a unos ${Math.round(km)} km`
  if (km < 1) return `a ${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`
  return `a ${km < 10 ? oneDecimal.format(km) : Math.round(km)} km`
}
