import { describe, expect, it } from 'vitest'
import { recommend, similarTo, type Recommendable } from '../../src/lib/recommend'

const make = (
  id: string,
  districtSlug: string,
  price: number,
  yieldMin = 8,
  origin: Recommendable['origin'] = 'owner',
): Recommendable => ({ id, districtSlug, price, yieldMin, yieldMax: yieldMin + 2, origin })

const lince = make('lince', 'lince', 310000)
const lince2 = make('lince2', 'lince', 330000)
const surquillo = make('surquillo', 'surquillo', 285000, 9)
const miraflores = make('miraflores', 'miraflores', 789000, 6, 'developer')
const all = [lince, lince2, surquillo, miraflores]

describe('similarTo', () => {
  it('prioriza el mismo distrito y precios cercanos, sin incluirse a sí mismo', () => {
    expect(similarTo(lince, all).map((p) => p.id)).toEqual(['lince2', 'surquillo', 'miraflores'])
  })
})

describe('recommend', () => {
  it('no recomienda nada sin historial', () => {
    expect(recommend(all, { viewed: [], saved: [] })).toEqual([])
  })

  it('recomienda parecidos a lo visto y no repite lo guardado', () => {
    const ids = recommend(all, { viewed: ['lince'], saved: ['lince2'] }).map((p) => p.id)
    expect(ids).not.toContain('lince2')
    expect(ids).toContain('surquillo')
  })

  it('un depa visto no se recomienda por sí solo, y queda detrás de lo nuevo', () => {
    expect(recommend(all, { viewed: ['lince'], saved: [] }).map((p) => p.id)[0]).toBe('lince2')
    expect(recommend(all, { viewed: ['lince'], saved: [] }).map((p) => p.id)).not.toContain('lince')
    const ids = recommend(all, { viewed: ['lince', 'surquillo'], saved: [] }).map((p) => p.id)
    expect(ids.indexOf('lince2')).toBeLessThan(ids.indexOf('lince'))
  })

  it('respeta el límite', () => {
    expect(recommend(all, { viewed: ['lince'], saved: [] }, 2)).toHaveLength(2)
  })
})
