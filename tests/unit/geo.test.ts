import { describe, expect, it } from 'vitest'
import {
  depaPosition,
  distanceKm,
  districtCenter,
  formatDistance,
  isNearLima,
  placeBySlug,
} from '../../src/lib/geo'

describe('geo', () => {
  it('mide la distancia en línea recta', () => {
    const kennedy = placeBySlug('parque-kennedy')!
    const larcomar = placeBySlug('larcomar')!
    expect(distanceKm(kennedy, larcomar)).toBeCloseTo(1.16, 1)
    expect(distanceKm(kennedy, kennedy)).toBe(0)
  })

  it('usa la ubicación del inmueble o, si no la tiene, el centro de su distrito', () => {
    expect(depaPosition({ location: { lat: -12.1, lng: -77.03 }, district: { slug: 'lince' } })).toEqual({
      lat: -12.1,
      lng: -77.03,
      exact: true,
    })
    expect(depaPosition({ location: null, district: { slug: 'lince' } })).toMatchObject({ exact: false })
    // Variantes del nombre con que se creó el distrito en el panel
    expect(districtCenter('magdalena')).toBe(districtCenter('magdalena-del-mar'))
    expect(districtCenter('surco')?.name).toBe('Santiago de Surco')
    expect(depaPosition({ district: { slug: 'distrito-desconocido' } })).toBeUndefined()
  })

  it('encuentra lugares y distritos por su slug', () => {
    expect(placeBySlug('larcomar')?.name).toBe('Larcomar (Miraflores)')
    expect(placeBySlug('miraflores')?.name).toBe('Miraflores')
    expect(placeBySlug('no-existe')).toBeUndefined()
  })

  it('escribe la distancia, redondeada si es aproximada', () => {
    expect(formatDistance(0.34, true)).toBe('a 350 m')
    expect(formatDistance(0.01, true)).toBe('a 50 m')
    expect(formatDistance(1.234, true)).toBe('a 1.2 km')
    expect(formatDistance(14.6, true)).toBe('a 15 km')
    expect(formatDistance(0.4, false)).toBe('a menos de 2 km')
    expect(formatDistance(4.6, false)).toBe('a unos 5 km')
  })

  it('reconoce si la ubicación del navegador está en Lima', () => {
    expect(isNearLima({ lat: -12.12, lng: -77.03 })).toBe(true)
    expect(isNearLima({ lat: 40.42, lng: -3.7 })).toBe(false) // Madrid
  })
})
