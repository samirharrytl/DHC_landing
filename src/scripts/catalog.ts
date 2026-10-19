// Descarga (una sola vez por página) el catálogo liviano /data/properties.json.
import type { CatalogItem } from '../pages/data/properties.json'

export type { CatalogItem }

let request: Promise<CatalogItem[]> | undefined

export function loadCatalog(): Promise<CatalogItem[]> {
  request ??= fetch('/data/properties.json').then((response) => {
    if (!response.ok) throw new Error(`catálogo: ${response.status}`)
    return response.json() as Promise<CatalogItem[]>
  })
  return request
}

/** Adaptador para recommend(): conserva el item completo junto a los campos que compara. */
export function asRecommendable(item: CatalogItem) {
  return {
    item,
    id: item.id,
    districtSlug: item.districtSlug,
    origin: item.origin,
    price: item.price.amount,
    yieldMin: item.yield.min,
    yieldMax: item.yield.max,
  }
}
