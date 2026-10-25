// /data/properties.json: catálogo liviano generado en el build para las partes que dependen
// del navegador de cada persona: Mis inmuebles, "Para ti, según lo que has visto" y "Te acompañamos".
// Las fotos ya van optimizadas (WebP en varios tamaños).
import type { APIRoute } from 'astro'
import { getImage } from 'astro:assets'
import { getProperties } from '../../lib/properties'
import { formatFacts, formatMoney, formatYears, formatYield } from '../../lib/format'

export interface CatalogItem {
  id: string
  slug: string
  url: string
  district: string
  districtSlug: string
  origin: 'owner' | 'developer'
  developer: { name: string; slug: string } | null
  address: string
  badge: string | null
  description: string | null
  status: 'published' | 'reserved' | 'sold'
  price: { amount: number; currency: 'PEN' | 'USD'; label: string }
  yield: { min: number; max: number }
  yieldLabel: string
  paybackLabel: string
  facts: string[]
  image: { src: string; srcset: string; alt: string } | null
}

export const GET: APIRoute = async () => {
  const properties = await getProperties()
  const items: CatalogItem[] = await Promise.all(
    properties.map(async (p) => {
      const photo = p.images[0]
      let image: CatalogItem['image'] = null
      if (photo) {
        const remote = typeof photo.src === 'string'
        const optimized = await getImage({
          src: photo.src,
          widths: [320, 480, 640],
          format: 'webp',
          ...(remote
            ? photo.width && photo.height
              ? { width: photo.width, height: photo.height }
              : { inferSize: true }
            : {}),
        })
        image = { src: optimized.src, srcset: optimized.srcSet.attribute, alt: photo.alt }
      }
      return {
        id: p.id,
        slug: p.slug,
        url: `/capital/${p.slug}`,
        district: p.district.name,
        districtSlug: p.district.slug,
        origin: p.origin,
        developer: p.developer ? { name: p.developer.name, slug: p.developer.slug } : null,
        address: p.address,
        badge: p.badge ?? null,
        description: p.description ?? null,
        status: p.status,
        price: { ...p.price, label: formatMoney(p.price.amount, p.price.currency) },
        yield: p.yield,
        yieldLabel: formatYield(p.yield),
        paybackLabel: `Se paga en ${formatYears(p.paybackYears)}`,
        facts: formatFacts(p),
        image,
      }
    }),
  )
  return new Response(JSON.stringify(items), { headers: { 'Content-Type': 'application/json' } })
}
