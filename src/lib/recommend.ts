// Recomendaciones simples y explicables, sin servidor:
// - "Depas similares" en el detalle (en el build)
// - "Para ti, según lo que has visto" en Capital (en el navegador, con el historial y Mis depas)
// Más adelante la API puede devolver recomendaciones según el perfil; la forma de los datos es la misma.

export interface Recommendable {
  id: string
  districtSlug: string
  origin: 'owner' | 'developer'
  price: number
  yieldMin: number
  yieldMax: number
}

/** Qué tan parecidos son dos depas: mismo distrito pesa más; luego precio, origen y rentabilidad. */
export function similarity(a: Recommendable, b: Recommendable): number {
  const sameDistrict = a.districtSlug === b.districtSlug ? 3 : 0
  const sameOrigin = a.origin === b.origin ? 1 : 0
  const priceGap = Math.abs(a.price - b.price) / Math.max(a.price, b.price, 1)
  const priceScore = Math.max(0, 2 - 4 * priceGap)
  const yieldGap = Math.abs((a.yieldMin + a.yieldMax) / 2 - (b.yieldMin + b.yieldMax) / 2)
  const yieldScore = Math.max(0, 1 - yieldGap / 3)
  return sameDistrict + sameOrigin + priceScore + yieldScore
}

/** Los más parecidos a un depa, sin incluirlo. */
export function similarTo<T extends Recommendable>(target: Recommendable, candidates: T[], limit = 4): T[] {
  return candidates
    .filter((c) => c.id !== target.id)
    .map((c) => ({ c, score: similarity(target, c) }))
    .sort((x, y) => y.score - x.score)
    .slice(0, limit)
    .map(({ c }) => c)
}

/**
 * Recomienda según lo guardado (pesa doble) y lo visto (lo más reciente pesa más).
 * No repite depas ya guardados. Sin historial no recomienda nada.
 */
export function recommend<T extends Recommendable>(
  candidates: T[],
  signals: { viewed: string[]; saved: string[] },
  limit = 4,
): T[] {
  const byId = new Map(candidates.map((c) => [c.id, c]))
  const seeds: { item: Recommendable; weight: number }[] = []
  signals.saved.forEach((id) => {
    const item = byId.get(id)
    if (item) seeds.push({ item, weight: 2 })
  })
  const recent = signals.viewed.slice(-6)
  recent.forEach((id, index) => {
    const item = byId.get(id)
    if (item) seeds.push({ item, weight: 0.5 + (index + 1) / recent.length })
  })
  if (seeds.length === 0) return []

  const saved = new Set(signals.saved)
  const viewed = new Set(signals.viewed)
  return candidates
    .filter((c) => !saved.has(c.id))
    .map((c) => {
      const score = seeds.reduce(
        (sum, seed) => sum + (seed.item.id === c.id ? 0 : seed.weight * similarity(seed.item, c)),
        0,
      )
      // Lo ya visto queda detrás de lo nuevo, pero no desaparece (catálogo chico)
      return { c, score: viewed.has(c.id) ? score * 0.6 : score }
    })
    .filter(({ score }) => score > 0)
    .sort((x, y) => y.score - x.score)
    .slice(0, limit)
    .map(({ c }) => c)
}
