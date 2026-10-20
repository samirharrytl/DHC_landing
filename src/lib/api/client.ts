// Cliente HTTP tipado de la API (repo depahost-api). Los tipos salen del contrato OpenAPI:
// si la API cambia, `pnpm api:sync` regenera schema.d.ts y TypeScript marca lo que hay que ajustar.
import createClient from 'openapi-fetch'
import { PUBLIC_API_URL } from 'astro:env/client'
import type { components, paths } from './schema'

export type ApiError = components['schemas']['ApiError']
export type LeadCreate = components['schemas']['LeadCreateInput']
export type ComplaintCreate = components['schemas']['ComplaintCreateInput']
export type ComplaintReceipt = components['schemas']['ComplaintReceipt']
export type AccountUser = components['schemas']['User']

export const API_URL = PUBLIC_API_URL ? PUBLIC_API_URL.replace(/\/$/, '') : undefined

/** Sin PUBLIC_API_URL los formularios no envían nada y ofrecen WhatsApp. */
export const apiConfigured = Boolean(API_URL)

// credentials: 'include' envía la cookie de sesión (si la persona inició sesión en el panel)
export const api = createClient<paths>({ baseUrl: API_URL ?? '', credentials: 'include' })
