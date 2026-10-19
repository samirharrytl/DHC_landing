// Única puerta de acceso a los datos de depas e inmobiliarias en el build.
// Las páginas importan de aquí, nunca de src/content ni de la API directamente.
import { getCollection, getEntry } from 'astro:content'
import type { Developer, FinancingAssumptions, Property } from '../types/property'
import { buildFastFilters, matchesFilters, toFilterable, type PropertyFilters } from './filters'
import { similarTo, type Recommendable } from './recommend'

/** Depas visibles en el sitio (publicados o reservados), destacados primero y luego los más nuevos. */
export async function getProperties(filters?: PropertyFilters): Promise<Property[]> {
  const entries = await getCollection('properties', ({ data }) => data.status !== 'sold')
  const list = entries
    .map((entry) => entry.data)
    .sort((a, b) => Number(b.featured) - Number(a.featured) || b.publishedAt.localeCompare(a.publishedAt))
  return filters ? list.filter((p) => matchesFilters(toFilterable(p), '', filters)) : list
}

/** Portada de Capital: los depas que publican propietarios. */
export async function getOwnerProperties(): Promise<Property[]> {
  return (await getProperties()).filter((p) => p.origin === 'owner')
}

export async function getPropertyBySlug(slug: string): Promise<Property | undefined> {
  return (await getProperties()).find((p) => p.slug === slug)
}

/** Ranking "Los 10 depas para invertir ahora": mayor rentabilidad, luego menor precio. */
export async function getTopProperties(limit = 10): Promise<Property[]> {
  return (await getProperties())
    .filter((p) => p.status === 'published')
    .sort((a, b) => b.yield.max - a.yield.max || b.yield.min - a.yield.min || a.price.amount - b.price.amount)
    .slice(0, limit)
}

export async function getFastFilters(properties?: Property[]) {
  return buildFastFilters(properties ?? (await getOwnerProperties()))
}

export const toRecommendable = (p: Property): Recommendable => ({
  id: p.id,
  districtSlug: p.district.slug,
  origin: p.origin,
  price: p.price.amount,
  yieldMin: p.yield.min,
  yieldMax: p.yield.max,
})

/** "Depas similares que te pueden interesar" del detalle. */
export async function getSimilarProperties(property: Property, limit = 4): Promise<Property[]> {
  const all = await getProperties()
  const byId = new Map(all.map((p) => [p.id, p]))
  return similarTo(toRecommendable(property), all.map(toRecommendable), limit).map((r) => byId.get(r.id)!)
}

// ---------- Inmobiliarias aliadas ----------

/** Inmobiliarias con la cantidad real de proyectos publicados en este build. */
export async function getDevelopers(): Promise<Developer[]> {
  const [entries, properties] = await Promise.all([getCollection('developers'), getProperties()])
  return entries
    .map(({ data }) => ({
      ...data,
      projectCount: properties.filter((p) => p.developer?.id === data.id).length,
    }))
    .sort((a, b) => b.projectCount - a.projectCount || a.name.localeCompare(b.name, 'es'))
}

export async function getDeveloperProjects(developerId: string): Promise<Property[]> {
  return (await getProperties()).filter((p) => p.developer?.id === developerId)
}

const EMPTY_FINANCING: FinancingAssumptions = {
  rate: null,
  downPaymentPct: null,
  termYears: null,
  asOf: null,
}

export async function getFinancingAssumptions(): Promise<FinancingAssumptions> {
  return (await getEntry('financing', 'current'))?.data ?? EMPTY_FINANCING
}
