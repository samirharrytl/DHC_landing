// Videos de la galería (VideoPlayer.astro): inserta el reproductor de YouTube/Vimeo al tocar la portada
// y permite detener los videos al pasar a otra foto o cerrar la vista ampliada.

const facades = new WeakMap<HTMLIFrameElement, HTMLButtonElement>()

document.addEventListener('click', (event) => {
  const facade = (event.target as Element | null)?.closest<HTMLButtonElement>('[data-embed-src]')
  if (!facade) return
  const iframe = document.createElement('iframe')
  iframe.src = facade.dataset.embedSrc ?? ''
  iframe.title = facade.dataset.embedTitle ?? 'Video'
  iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'
  iframe.allowFullscreen = true
  facades.set(iframe, facade)
  facade.replaceWith(iframe)
  iframe.focus()
})

/** Pausa los videos de root y vuelve a poner la portada de los de YouTube/Vimeo (salvo los de keep). */
export function stopVideos(root: ParentNode, keep?: Element | null) {
  root.querySelectorAll('video').forEach((video) => {
    if (!keep?.contains(video)) video.pause()
  })
  root.querySelectorAll('iframe').forEach((iframe) => {
    const facade = facades.get(iframe)
    if (facade && !keep?.contains(iframe)) iframe.replaceWith(facade)
  })
}
