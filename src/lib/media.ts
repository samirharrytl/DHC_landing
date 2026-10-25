// Videos de los depas: un link de YouTube o Vimeo, o un archivo de video (.mp4, .webm).
// YouTube y Vimeo se insertan con su reproductor en modo privado (sin cookies de seguimiento)
// y solo al tocar "reproducir", para no cargar sus scripts antes de tiempo.

export type VideoSource =
  | { kind: 'youtube'; id: string; embedUrl: string }
  | { kind: 'vimeo'; id: string; embedUrl: string }
  | { kind: 'file'; url: string }

const YOUTUBE = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/
const VIMEO = /vimeo\.com\/(?:video\/)?(\d+)/

export function parseVideo(url: string): VideoSource {
  const youtube = url.match(YOUTUBE)
  if (youtube)
    return {
      kind: 'youtube',
      id: youtube[1]!,
      embedUrl: `https://www.youtube-nocookie.com/embed/${youtube[1]}?autoplay=1&rel=0&playsinline=1`,
    }
  const vimeo = url.match(VIMEO)
  if (vimeo)
    return {
      kind: 'vimeo',
      id: vimeo[1]!,
      embedUrl: `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1&dnt=1`,
    }
  return { kind: 'file', url }
}
