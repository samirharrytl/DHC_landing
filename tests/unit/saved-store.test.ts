import { describe, expect, it, vi } from 'vitest'
import { createLocalSavedStore, SAVED_KEY, type StorageLike } from '../../src/lib/saved-store'

const memoryStorage = (initial: Record<string, string> = {}): StorageLike => {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  }
}

describe('saved-store', () => {
  it('agrega, quita y alterna sin duplicados', () => {
    const store = createLocalSavedStore(memoryStorage(), new EventTarget())
    store.add('a')
    store.add('a')
    store.add('b')
    expect(store.list()).toEqual(['a', 'b'])
    store.toggle('a')
    expect(store.list()).toEqual(['b'])
    store.toggle('a')
    expect(store.has('a')).toBe(true)
    store.clear()
    expect(store.list()).toEqual([])
  })

  it('touch mueve el inmueble al final (el más reciente)', () => {
    const store = createLocalSavedStore(memoryStorage(), new EventTarget())
    store.add('a')
    store.add('b')
    store.touch('a')
    expect(store.list()).toEqual(['b', 'a'])
    store.touch('c')
    expect(store.list()).toEqual(['b', 'a', 'c'])
  })

  it('tolera datos corruptos', () => {
    const store = createLocalSavedStore(memoryStorage({ [SAVED_KEY]: '{no es json' }), new EventTarget())
    expect(store.list()).toEqual([])
    const mixed = createLocalSavedStore(memoryStorage({ [SAVED_KEY]: '["a", 3, null]' }), new EventTarget())
    expect(mixed.list()).toEqual(['a'])
  })

  it('respeta el máximo y conserva los más recientes', () => {
    const store = createLocalSavedStore(memoryStorage(), new EventTarget(), 2)
    store.add('a')
    store.add('b')
    store.add('c')
    expect(store.list()).toEqual(['b', 'c'])
  })

  it('avisa a los suscriptores, también por cambios de otra pestaña', () => {
    const events = new EventTarget()
    const storage = memoryStorage()
    const store = createLocalSavedStore(storage, events)
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)

    store.add('a')
    expect(listener).toHaveBeenLastCalledWith(['a'])

    storage.setItem(SAVED_KEY, '["a","z"]')
    events.dispatchEvent(Object.assign(new Event('storage'), { key: SAVED_KEY }))
    expect(listener).toHaveBeenLastCalledWith(['a', 'z'])

    unsubscribe()
    store.add('b')
    expect(listener).toHaveBeenCalledTimes(2)
  })
})
