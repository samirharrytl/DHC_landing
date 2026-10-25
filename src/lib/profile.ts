// Perfil liviano: el nombre que la persona dejó en "Guarda tus inmuebles", para saludarla ("Hola, Ana").
// Solo se guarda el primer nombre en el navegador: el contacto completo queda en la API (lead).
// Cuando exista login, esto se reemplaza por la sesión (GET /v1/me).
import { browserStorage, type StorageLike } from './saved-store'

export const PROFILE_KEY = 'depahost:profile'
export const PROFILE_EVENT = 'depahost:profile-updated'
const PROMPT_KEY = 'depahost:save-prompt-dismissed'
const PROMPT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000

export interface Profile {
  firstName: string
}

/** "  ana lucía  " → "Ana" */
export function firstNameOf(fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0] ?? ''
  return (first.charAt(0).toLocaleUpperCase('es-PE') + first.slice(1)).slice(0, 40)
}

export function createProfileStore(storage: StorageLike, events: EventTarget) {
  return {
    get(): Profile | null {
      try {
        const parsed = JSON.parse(storage.getItem(PROFILE_KEY) ?? 'null') as Profile | null
        return parsed && typeof parsed.firstName === 'string' && parsed.firstName ? parsed : null
      } catch {
        return null
      }
    },
    set(fullName: string) {
      const profile = { firstName: firstNameOf(fullName) }
      if (!profile.firstName) return
      try {
        storage.setItem(PROFILE_KEY, JSON.stringify(profile))
      } catch {
        // sin almacenamiento: el saludo vale solo para esta página
      }
      events.dispatchEvent(new CustomEvent(PROFILE_EVENT, { detail: profile }))
    },
    clear() {
      storage.removeItem(PROFILE_KEY)
      events.dispatchEvent(new CustomEvent(PROFILE_EVENT, { detail: null }))
    },
    /** ¿Mostrar "Guarda tus inmuebles"? No si ya dejó sus datos o lo cerró hace menos de 7 días. */
    shouldPrompt(now = Date.now()): boolean {
      if (this.get()) return false
      const dismissed = Number(storage.getItem(PROMPT_KEY) ?? 0)
      return !dismissed || now - dismissed > PROMPT_COOLDOWN_MS
    },
    dismissPrompt(now = Date.now()) {
      try {
        storage.setItem(PROMPT_KEY, String(now))
      } catch {
        // nada que hacer
      }
    },
  }
}

export type ProfileStore = ReturnType<typeof createProfileStore>

let instance: ProfileStore | undefined
export function getProfileStore(): ProfileStore {
  instance ??= createProfileStore(browserStorage(), window)
  return instance
}
