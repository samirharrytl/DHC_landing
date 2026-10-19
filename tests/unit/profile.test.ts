import { describe, expect, it } from 'vitest'
import { createProfileStore, firstNameOf } from '../../src/lib/profile'
import type { StorageLike } from '../../src/lib/saved-store'

const memory = (): StorageLike => {
  const data = new Map<string, string>()
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  }
}

describe('profile', () => {
  it('guarda solo el primer nombre, con mayúscula inicial', () => {
    expect(firstNameOf('  ana lucía quispe ')).toBe('Ana')
    const store = createProfileStore(memory(), new EventTarget())
    store.set('carlos ramírez')
    expect(store.get()).toEqual({ firstName: 'Carlos' })
  })

  it('deja de pedir los datos al tenerlos o por 7 días tras cerrar el aviso', () => {
    const store = createProfileStore(memory(), new EventTarget())
    const now = Date.UTC(2026, 9, 19)
    expect(store.shouldPrompt(now)).toBe(true)
    store.dismissPrompt(now)
    expect(store.shouldPrompt(now + 24 * 3600_000)).toBe(false)
    expect(store.shouldPrompt(now + 8 * 24 * 3600_000)).toBe(true)
    store.set('Ana')
    expect(store.shouldPrompt(now + 30 * 24 * 3600_000)).toBe(false)
  })
})
