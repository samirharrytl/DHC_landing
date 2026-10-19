// Botones "Me interesa" (tarjetas, detalle y proyectos): agregan o quitan el depa de Mis depas.
// Son botones de alternancia (aria-pressed), así que un segundo clic lo quita.
import { getSavedStore } from '../lib/saved-store'

const store = getSavedStore()
const buttons = () => document.querySelectorAll<HTMLButtonElement>('[data-add-property]')

const render = (ids: string[]) => {
  buttons().forEach((button) => {
    const id = button.dataset.propertyId ?? ''
    const name = button.dataset.propertyName ?? id
    const saved = ids.includes(id)
    button.setAttribute('aria-pressed', String(saved))
    const label = button.querySelector('[data-save-label]')
    if (label) label.textContent = saved ? 'Guardado' : 'Me interesa'
    button.setAttribute(
      'aria-label',
      saved ? `Quitar ${name} de Mis depas` : `Me interesa: agregar ${name} a Mis depas`,
    )
  })
}

// Delegación: también funciona con tarjetas que se pintan después (recomendaciones)
document.addEventListener('click', (event) => {
  const button = (event.target as Element | null)?.closest<HTMLButtonElement>('[data-add-property]')
  const id = button?.dataset.propertyId
  if (id) store.toggle(id)
})

store.subscribe(render)
render(store.list())

export const renderSaveButtons = () => render(store.list())
