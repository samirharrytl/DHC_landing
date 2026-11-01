import { describe, expect, it } from 'vitest'
import { propertyFacts } from '../../src/lib/facts'

describe('propertyFacts', () => {
  it('junta dormitorios y baños en una columna, y suma área y antigüedad', () => {
    const facts = propertyFacts({ bedrooms: 2, bathrooms: 1, areaM2: 70, yearBuilt: 2016 }, 2026)
    expect(facts.map((f) => f.label)).toEqual(['dorm. y baños', 'área', 'antigüedad'])
    expect(facts[0]?.parts).toEqual([
      { icon: 'bed', value: '2', name: 'dormitorios' },
      { icon: 'bath', value: '1', name: 'baño' },
    ])
    expect(facts[1]?.parts[0]?.value).toBe('70 m²')
    expect(facts[2]?.parts[0]?.value).toBe('10 años')
  })

  it('con solo dormitorios o solo baños, la etiqueta dice cuál es', () => {
    expect(propertyFacts({ bedrooms: 1 })).toEqual([
      { parts: [{ icon: 'bed', value: '1' }], label: 'dormitorio' },
    ])
    expect(propertyFacts({ bathrooms: 2 })).toEqual([
      { parts: [{ icon: 'bath', value: '2' }], label: 'baños' },
    ])
  })

  it('un proyecto por entregar muestra el año de entrega', () => {
    expect(propertyFacts({ yearBuilt: 2028 }, 2026)).toEqual([
      { parts: [{ icon: 'building', value: '2028' }], label: 'entrega' },
    ])
  })

  it('sin datos no arma columnas', () => {
    expect(propertyFacts({ bedrooms: null, bathrooms: null, areaM2: null, yearBuilt: null })).toEqual([])
  })
})
