// Colecciones de datos del sitio. El esquema refleja la respuesta de la API (repo depahost-api):
// si la API cambia de forma, el build falla aquí en vez de romper una página.
import { defineCollection } from 'astro:content'
import { z } from 'astro/zod'
import { fetchJson, hybridLoader } from './lib/api/loaders'
import type { components } from './lib/api/schema'

type ApiProperty = components['schemas']['Property']
type ApiPropertyPage = components['schemas']['PropertyPage']
type ApiFinancing = components['schemas']['FinancingAssumptions']
type ApiDeveloper = components['schemas']['Developer']

// Se lee en el build. Ver .env.example
const API_URL: string | undefined = import.meta.env.API_URL || undefined

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
      badge: z.string().nullish(),
      description: z.string().nullish(),
      price: z.object({ amount: z.number().nonnegative(), currency: z.enum(['PEN', 'USD']) }),
      yield: z.object({ min: z.number(), max: z.number() }),
      paybackYears: z.number().positive(),
      areaM2: z.number().nullish(),
      bedrooms: z.number().int().nullish(),
      bathrooms: z.number().nullish(),
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
  loader: hybridLoader({
    name: 'financing',
    localFile: 'src/content/financing.json',
    apiUrl: API_URL,
    async fetchRemote(apiUrl) {
      const response = await fetch(`${apiUrl}/v1/financing-assumptions`)
      if (response.status === 404) return [] // aún no cargan supuestos: se muestran [plazo], [X]…
      if (!response.ok) throw new Error(`financing-assumptions respondió ${response.status}`)
      const f = (await response.json()) as ApiFinancing
      return [{ id: 'current', ...f }]
    },
  }),
  schema: z.object({
    rate: z.number().nullable(),
    downPaymentPct: z.number().nullable(),
    termYears: z.number().nullable(),
    asOf: z.string().nullable(),
  }),
})

// Inmobiliarias aliadas: tienen su página /capital/aliados/{slug}
const developers = defineCollection({
  loader: hybridLoader({
    name: 'developers',
    localFile: 'src/content/developers.json',
    apiUrl: API_URL,
    fetchRemote: (apiUrl) => fetchJson<ApiDeveloper[]>(`${apiUrl}/v1/developers`),
  }),
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
