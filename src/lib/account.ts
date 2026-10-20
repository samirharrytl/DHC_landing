// Cuenta en el sitio (solo navegador). La sesión la crea el panel (depahost-panel) y la guarda el
// API en una cookie que el sitio no puede leer. El API deja además "dh_has_session=1", legible y
// sin secretos: si no está, el sitio ni pregunta (los visitantes anónimos no generan llamadas).
import { api, apiConfigured, type AccountUser } from './api/client'
import { getSavedStore } from './saved-store'

const HINT = 'dh_has_session'

export const hasSessionHint = () => document.cookie.split('; ').some((c) => c === `${HINT}=1`)

function clearHint() {
  const parts = location.hostname.split('.')
  const domains = ['', ...parts.map((_, i) => '.' + parts.slice(i).join('.')).slice(0, -1)]
  for (const domain of domains) {
    document.cookie = `${HINT}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ''}`
  }
}

let current: Promise<AccountUser | null> | undefined

/** Persona con sesión iniciada, o null. Se consulta una sola vez por página. */
export function getAccount(): Promise<AccountUser | null> {
  current ??= (async () => {
    if (!apiConfigured || !hasSessionHint()) return null
    const { data, response } = await api.GET('/v1/auth/me')
    if (response.status === 401) clearHint()
    return data ?? null
  })().catch(() => null)
  return current
}

let syncing = false

/**
 * Une "Mis depas" del navegador con los de la cuenta y, desde ahí, guarda cada cambio en la cuenta.
 * Así lo que la persona guardó antes de iniciar sesión no se pierde.
 */
export async function syncSavedWithAccount() {
  if (syncing) return
  syncing = true
  const user = await getAccount()
  if (!user) return
  const store = getSavedStore()
  const remote = await api.GET('/v1/me/saved')
  if (!remote.data) return

  const server = remote.data.propertyIds
  const merged = [...server, ...store.list().filter((id) => !server.includes(id))]
  let final = server
  if (merged.length !== server.length) {
    const saved = await api.PUT('/v1/me/saved', { body: { propertyIds: merged } })
    final = saved.data?.propertyIds ?? merged
  }
  store.set(final)

  let timer: ReturnType<typeof setTimeout> | undefined
  store.subscribe((ids) => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      api.PUT('/v1/me/saved', { body: { propertyIds: ids } }).catch(() => {})
    }, 600)
  })
}
