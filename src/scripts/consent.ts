// Consentimiento de analítica y carga diferida de Microsoft Clarity.
import { PUBLIC_CLARITY_ID } from 'astro:env/client'

export type Consent = 'granted' | 'denied'
const KEY = 'depahost:consent'

export function getConsent(): Consent | null {
  try {
    const value = localStorage.getItem(KEY)
    return value === 'granted' || value === 'denied' ? value : null
  } catch {
    return null
  }
}

export function setConsent(value: Consent) {
  try {
    localStorage.setItem(KEY, value)
  } catch {
    // Sin almacenamiento: la elección vale solo para esta página
  }
}

let loaded = false

/** Inserta el script de Clarity (una sola vez). */
export function loadAnalytics() {
  if (loaded || !PUBLIC_CLARITY_ID) return
  loaded = true
  const w = window as unknown as { clarity?: ((...args: unknown[]) => void) & { q?: unknown[] } }
  const queue: unknown[] = []
  w.clarity ??= Object.assign((...args: unknown[]) => queue.push(args), { q: queue })
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.clarity.ms/tag/${encodeURIComponent(PUBLIC_CLARITY_ID)}`
  document.head.append(script)
}
