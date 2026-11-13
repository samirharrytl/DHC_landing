// Colecciones de datos del sitio. El esquema refleja la respuesta de la API (el panel de DepaHost, /api/v1):
// si la API cambia de forma, el build falla aquí en vez de romper una página.
// Los inmuebles vienen solo del panel; sin API_URL, de src/content/properties.json (vacío). Las inmobiliarias
// aliadas y los supuestos de financiamiento viven solo en el sitio, en src/content/*.json.
import { defineCollection } from 'astro:content'
import { file } from 'astro/loaders'
import { z } from 'astro/zod'
import { fetchJson, hybridLoader } from './lib/api/loaders'
import type { components } from './lib/api/schema'

type ApiProperty = components['schemas']['Property']
type ApiPropertyPage = components['schemas']['PropertyPage']

// Se lee en el build. Ver .env.example
const API_URL = import.meta.env.API_URL

const properties = defineCollection({
  loader: hybridLoader({
    name: 'properties',
    localFile: 'src/content/properties.json',
    apiUrl: API_URL,
    async fetchRemote(apiUrl) {
      const all: ApiProperty[] = []
      for (let page = 1; ; page++) {
        const result = await fetchJson<ApiPropertyPage>(`${apiUrl}/v1/properties?page=${page}&pageSize=100`)
        all.push(...result.data)
        if (all.length >= result.total || result.data.length === 0) break
      }
      // La API entrega images[].url; el sitio usa images[].src (que también acepta fotos locales)
      return all.map(({ images, ...p }) => ({
        ...p,
        images: images.map(({ url, ...img }) => ({ ...img, src: url })),
      }))
    },
  }),
  schema: ({ image }) =>
    z.object({
      id: z.string(),
      slug: z.string(),
      district: z.object({ id: z.string(), name: z.string(), slug: z.string() }),
      // owner: lo publica un propietario · developer: proyecto de una inmobiliaria aliada
      origin: z.enum(['owner', 'developer']),
      developer: z.object({ id: z.string(), slug: z.string(), name: z.string() }).nullable(),
      address: z.string(),
      // Ubicación exacta para "Cerca de" en Todos los inmuebles. El API aún no la envía: sin ella se usa
      // el centro del distrito (src/lib/geo.ts).
      location: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).nullish(),
      badge: z.string().nullish(),
      description: z.string().nullish(),
      price: z.object({ amount: z.number().nonnegative(), currency: z.enum(['PEN', 'USD']) }),
      // El panel solo los envía si se registraron en la ficha; sin ellos el sitio no muestra rentabilidad
      yield: z.object({ min: z.number(), max: z.number() }).nullable(),
      paybackYears: z.number().positive().nullable(),
      areaM2: z.number().nullish(),
      bedrooms: z.number().int().nullish(),
      bathrooms: z.number().nullish(),
      // Año de construcción; en un proyecto, el año de entrega (la tarjeta muestra la antigüedad)
      yearBuilt: z.number().int().nullish(),
      images: z.array(
        z.object({
          // URL de la API (https://…) o ruta a una foto local (../assets/…)
          src: z.union([z.url(), image()]),
          alt: z.string(),
          width: z.number().int().nullish(),
          height: z.number().int().nullish(),
        }),
      ),
      // Videos: link de YouTube o Vimeo, o archivo .mp4/.webm (ver src/lib/media.ts). El API aún no los envía.
      videos: z.array(z.object({ url: z.string().min(1), title: z.string().nullish() })).default([]),
      status: z.enum(['published', 'reserved', 'sold']),
      featured: z.boolean(),
      publishedAt: z.string(),
    }),
})

const financing = defineCollection({
  loader: file('src/content/financing.json'),
  schema: z.object({
    rate: z.number().nullable(),
    downPaymentPct: z.number().nullable(),
    termYears: z.number().nullable(),
    asOf: z.string().nullable(),
  }),
})

// Inmobiliarias aliadas: tienen su página /capital/aliados/{slug}
const developers = defineCollection({
  loader: file('src/content/developers.json'),
  schema: z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    logoUrl: z.url().nullable(),
    website: z.url().nullable(),
    projectCount: z.number().int(),
  }),
})

export const collections = { properties, financing, developers }
