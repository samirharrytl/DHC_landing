// Buscador y filtros rápidos de depas, para cualquier bloque con data-filter-root:
//   [data-filter-search]   input de búsqueda (o un form de búsqueda que lo contenga)
//   [data-favorite-filter] chips con data-filter-kind y data-filter-value
//   [data-property-card]   tarjetas con data-search, data-district y data-price
//   [data-filter-empty]    mensaje sin resultados
//   [data-results-count]   "3 proyectos encontrados" (data-singular / data-plural)
//   [data-clear-filters]   "Limpiar filtros" (se muestra solo si hay algo activo)
import { matchesFilters, parseFilters, type FilterableProperty } from '../lib/filters'

document.querySelectorAll<HTMLElement>('[data-filter-root]').forEach((root) => {
  const search = root.querySelector<HTMLInputElement>('[data-filter-search]')
  const cards = [...root.querySelectorAll<HTMLElement>('[data-property-card]')]
  const chips = [...root.querySelectorAll<HTMLButtonElement>('[data-favorite-filter]')]
  const empty = root.querySelector<HTMLElement>('[data-filter-empty]')
  const count = root.querySelector<HTMLElement>('[data-results-count]')
  const clear = root.querySelector<HTMLButtonElement>('[data-clear-filters]')
  const active = new Map<string, string>()

  const data = new Map<HTMLElement, FilterableProperty>(
    cards.map((card) => [
      card,
      {
        districtSlug: card.dataset.district ?? '',
        price: Number(card.dataset.price),
        searchText: card.dataset.search ?? '',
      },
    ]),
  )

  const update = () => {
    const query = search?.value ?? ''
    const filters = parseFilters(active)
    let visible = 0
    for (const [card, property] of data) {
      card.hidden = !matchesFilters(property, query, filters)
      if (!card.hidden) visible += 1
    }
    if (empty) empty.hidden = visible > 0
    if (count) {
      const noun = visible === 1 ? count.dataset.singular : count.dataset.plural
      count.textContent = `${visible} ${noun ?? ''}`.trim()
    }
    if (clear) clear.hidden = active.size === 0 && query.trim() === ''
    chips.forEach((chip) => {
      chip.setAttribute(
        'aria-pressed',
        String(active.get(chip.dataset.filterKind ?? '') === chip.dataset.filterValue),
      )
    })
  }

  search?.addEventListener('input', update)
  search?.form?.addEventListener('submit', (event) => {
    event.preventDefault()
    update()
    search.blur()
  })

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const kind = chip.dataset.filterKind
      const value = chip.dataset.filterValue
      if (!kind || !value) return
      if (active.get(kind) === value) active.delete(kind)
      else active.set(kind, value)
      update()
    })
  })

  clear?.addEventListener('click', () => {
    active.clear()
    if (search) search.value = ''
    update()
    search?.focus()
  })

  update()
})
