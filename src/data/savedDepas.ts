export const SAVED_DEPAS_KEY = 'depahost:saved-depas'
export const SAVED_DEPAS_EVENT = 'depahost:saved-depas-updated'

export const depaId = (district: string) => district
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')

export function getSavedDepas(): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVED_DEPAS_KEY) ?? '[]')
    return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function setSavedDepas(ids: string[]) {
  const uniqueIds = [...new Set(ids)]
  localStorage.setItem(SAVED_DEPAS_KEY, JSON.stringify(uniqueIds))
  window.dispatchEvent(new CustomEvent(SAVED_DEPAS_EVENT, { detail: uniqueIds }))
  return uniqueIds
}
