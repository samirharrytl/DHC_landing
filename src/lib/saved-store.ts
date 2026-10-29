// Listas de IDs guardadas en el navegador:
// - "Mis inmuebles": los inmuebles que la persona marcó con "Me interesa"
// - Historial: los últimos inmuebles que abrió (para "Según lo que has visto")
// Hoy viven en localStorage. La interfaz permite cambiar "Mis inmuebles" por una implementación que
// sincronice con la API (GET/PUT /v1/me/saved) cuando haya login, sin tocar los componentes.

export const SAVED_KEY = 'depahost:saved-depas:v2'
export const SAVED_EVENT = 'depahost:saved-depas-updated'
export const MAX_SAVED = 20

export const HISTORY_KEY = 'depahost:viewed-depas'
export const HISTORY_EVENT = 'depahost:viewed-depas-updated'
export const MAX_HISTORY = 12

export interface IdListStore {
  list(): string[]
  has(id: string): boolean
  add(id: string): string[]
  remove(id: string): string[]
  toggle(id: string): string[]
  /** Mueve el ID al final (el más reciente), agregándolo si no estaba. */
  touch(id: string): string[]
  /** Reemplaza la lista completa (sincronización con la cuenta). */
  set(ids: string[]): string[]
  clear(): void
  /** Llama a fn cada vez que cambia la lista (también desde otra pestaña). Devuelve cómo desuscribirse. */
  subscribe(fn: (ids: string[]) => void): () => void
}

/** Se mantiene el nombre por compatibilidad: "Mis inmuebles" es un IdListStore. */
export type SavedStore = IdListStore

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

interface ListOptions {
  key: string
  event: string
  max: number
}

export function createIdListStore(
  storage: StorageLike,
  events: EventTarget,
  options: ListOptions,
): IdListStore {
  const { key, event, max } = options
  const read = (): string[] => {
    try {
      const parsed: unknown = JSON.parse(storage.getItem(key) ?? '[]')
      return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
    } catch {
      return []
    }
  }

  const write = (ids: string[]) => {
    const unique = [...new Set(ids)].slice(-max)
    try {
      storage.setItem(key, JSON.stringify(unique))
    } catch {
      // Almacenamiento lleno o bloqueado: la lista sigue viva en esta página
    }
    events.dispatchEvent(new CustomEvent(event, { detail: unique }))
    return unique
  }

  const store: IdListStore = {
    list: read,
    has: (id) => read().includes(id),
    add: (id) => write([...read(), id]),
    remove: (id) => write(read().filter((saved) => saved !== id)),
    toggle: (id) => (store.has(id) ? store.remove(id) : store.add(id)),
    touch: (id) => write([...read().filter((saved) => saved !== id), id]),
    set: (ids) => write(ids),
    clear: () => {
      write([])
    },
    subscribe(fn) {
      const onLocal = () => {
        fn(read())
      }
      const onStorage = (e: Event) => {
        if ((e as StorageEvent).key === key) fn(read())
      }
      events.addEventListener(event, onLocal)
      events.addEventListener('storage', onStorage)
      return () => {
        events.removeEventListener(event, onLocal)
        events.removeEventListener('storage', onStorage)
      }
    },
  }
  return store
}

export const createLocalSavedStore = (storage: StorageLike, events: EventTarget, max = MAX_SAVED) =>
  createIdListStore(storage, events, { key: SAVED_KEY, event: SAVED_EVENT, max })

/** localStorage puede no existir o lanzar error (modo privado, cookies bloqueadas). */
export function browserStorage(): StorageLike {
  try {
    const probe = '__depahost__'
    window.localStorage.setItem(probe, probe)
    window.localStorage.removeItem(probe)
    return window.localStorage
  } catch {
    const memory = new Map<string, string>()
    return {
      getItem: (k) => memory.get(k) ?? null,
      setItem: (k, v) => void memory.set(k, v),
      removeItem: (k) => void memory.delete(k),
    }
  }
}

let saved: IdListStore | undefined
let history: IdListStore | undefined

/** "Mis inmuebles" del navegador. */
export function getSavedStore(): IdListStore {
  saved ??= createLocalSavedStore(browserStorage(), window)
  return saved
}

/** Últimos inmuebles abiertos (el más reciente al final). */
export function getHistoryStore(): IdListStore {
  history ??= createIdListStore(browserStorage(), window, {
    key: HISTORY_KEY,
    event: HISTORY_EVENT,
    max: MAX_HISTORY,
  })
  return history
}
