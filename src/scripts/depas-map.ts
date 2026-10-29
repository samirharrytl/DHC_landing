// Vista de mapa de "Todos los inmuebles" (/capital/inmuebles). Se carga solo cuando la persona elige "Mapa"
// (import dinámico), así Leaflet no pesa en la carga normal de la página.
// Cada inmueble es un pin con su precio; de lejos, un punto. Al tocarlo se abre una mini tarjeta.
import L from 'leaflet'
// ?url: el CSS de Leaflet se pide al abrir el mapa (con un import normal, Astro lo pondría en el <head>)
import leafletCss from 'leaflet/dist/leaflet.css?url'
import { PUBLIC_MAP_ATTRIBUTION, PUBLIC_MAP_TILE_URL } from 'astro:env/client'
import { formatPEN, formatPENShort } from '../lib/format'

export interface MapDepa {
  id: string
  lat: number
  lng: number
  /** false: la ubicación es el centro del distrito */
  exact: boolean
  price: number
  district: string
  address: string
  href: string
  image?: string
  /** "a 350 m de Larcomar" cuando hay un punto en "Cerca de" */
  distance?: string
}

export interface MapOrigin {
  lat: number
  lng: number
  name: string
  radiusKm?: number
}

const LIMA: L.LatLngTuple = [-12.1, -77.03]
/** Desde este zoom los pines muestran el precio; antes son puntos (para que no se tapen) */
const PRICE_ZOOM = 13

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) => {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text) node.textContent = text
  return node
}

/** Mini tarjeta del pin (con DOM y textContent: los textos vienen del API) */
function popupFor(depa: MapDepa): HTMLElement {
  const card = el('div', 'map-card')
  if (depa.image) {
    const img = el('img')
    img.src = depa.image
    img.alt = ''
    img.loading = 'lazy'
    card.append(img)
  }
  const body = el('div', 'map-card-body')
  body.append(el('strong', 'map-card-title', depa.district), el('span', 'map-card-address', depa.address))
  if (depa.distance) body.append(el('span', 'map-card-distance', depa.distance))
  else if (!depa.exact) body.append(el('span', 'map-card-note', 'Ubicación aproximada: centro del distrito'))
  body.append(el('span', 'map-card-price', formatPEN(depa.price)))
  const link = el('a', 'btn btn--secondary btn--sm', 'Ver más detalle')
  link.href = depa.href
  body.append(link)
  card.append(body)
  return card
}

/**
 * Los inmuebles sin ubicación exacta comparten el punto de su distrito: se reparten en un círculo
 * pequeño (~250 m) para que todos se puedan tocar.
 */
function spread(depas: MapDepa[]): (MapDepa & { at: L.LatLngTuple })[] {
  const groups = new Map<string, MapDepa[]>()
  for (const d of depas) {
    const key = d.exact ? d.id : `${d.lat},${d.lng}`
    groups.set(key, [...(groups.get(key) ?? []), d])
  }
  return [...groups.values()].flatMap((group) =>
    group.map((d, i) => {
      if (group.length === 1) return { ...d, at: [d.lat, d.lng] as L.LatLngTuple }
      const angle = (2 * Math.PI * i) / group.length
      return {
        ...d,
        at: [d.lat + 0.0023 * Math.sin(angle), d.lng + 0.0023 * Math.cos(angle)] as L.LatLngTuple,
      }
    }),
  )
}

function loadLeafletCss(): Promise<void> {
  if (document.querySelector(`link[href="${leafletCss}"]`)) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = leafletCss
    link.onload = () => {
      resolve()
    }
    link.onerror = reject
    document.head.append(link)
  })
}

export async function createDepasMap(container: HTMLElement) {
  await loadLeafletCss()
  const map = L.map(container, { center: LIMA, zoom: 12, scrollWheelZoom: false })
  L.tileLayer(PUBLIC_MAP_TILE_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution:
      PUBLIC_MAP_ATTRIBUTION ?? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map)

  // La rueda del mouse acerca el mapa solo después de hacer clic en él (si no, la página no baja)
  map.on('click focus', () => map.scrollWheelZoom.enable())
  map.on('mouseout blur', () => map.scrollWheelZoom.disable())

  const updateZoomClass = () => container.classList.toggle('is-far', map.getZoom() < PRICE_ZOOM)
  map.on('zoomend', updateZoomClass)

  const pins = L.layerGroup().addTo(map)
  const originLayer = L.layerGroup().addTo(map)
  let lastKey = ''

  return {
    /** Pinta los inmuebles visibles y el punto de "Cerca de". Reencuadra solo si cambió qué se muestra. */
    update(depas: MapDepa[], origin?: MapOrigin) {
      pins.clearLayers()
      originLayer.clearLayers()

      for (const depa of spread(depas)) {
        const label = el('span', 'map-pin', formatPENShort(depa.price))
        const marker = L.marker(depa.at, {
          icon: L.divIcon({ className: 'map-pin-anchor', html: label, iconSize: [0, 0] }),
          title: `${depa.district}, ${depa.address}: ${formatPEN(depa.price)}`,
          riseOnHover: true,
        })
        marker.bindPopup(() => popupFor(depa), { maxWidth: 260, minWidth: 220, offset: [0, -30] })
        marker.on('popupopen', () => {
          label.classList.add('is-active')
        })
        marker.on('popupclose', () => {
          label.classList.remove('is-active')
        })
        pins.addLayer(marker)
      }

      if (origin) {
        const point: L.LatLngTuple = [origin.lat, origin.lng]
        if (origin.radiusKm)
          originLayer.addLayer(
            L.circle(point, {
              radius: origin.radiusKm * 1000,
              color: '#031a39',
              weight: 1.5,
              fillOpacity: 0.06,
              interactive: false,
            }),
          )
        originLayer.addLayer(
          L.marker(point, {
            icon: L.divIcon({ className: 'map-origin', iconSize: [22, 22] }),
            title: `Cerca de ${origin.name}`,
            zIndexOffset: 1000,
            keyboard: false,
          }),
        )
      }

      const key = `${depas.map((d) => d.id).join()}|${origin ? `${origin.lat},${origin.lng},${origin.radiusKm}` : ''}`
      if (key === lastKey) return
      lastKey = key
      const points: L.LatLngTuple[] = depas.map((d) => [d.lat, d.lng])
      if (origin) points.push([origin.lat, origin.lng])
      if (points.length) map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 15 })
      updateZoomClass()
    },
    /** Después de mostrar el contenedor (estaba oculto): Leaflet recalcula su tamaño */
    resize() {
      map.invalidateSize()
    },
  }
}

export type DepasMap = Awaited<ReturnType<typeof createDepasMap>>
