// Videos de los inmuebles: un link de YouTube o Vimeo, o un archivo de video (.mp4, .webm).
// YouTube y Vimeo se insertan con su reproductor en modo privado (sin cookies de seguimiento)
// y solo al tocar "reproducir", para no cargar sus scripts antes de tiempo.

export type VideoSource =
  | { kind: 'youtube'; id: string; embedUrl: string }
  | { kind: 'vimeo'; id: string; embedUrl: string }
  | { kind: 'file'; url: string }

const YOUTUBE = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/
const VIMEO = /vimeo\.com\/(?:video\/)?(\d+)/

export function parseVideo(url: string): VideoSource {
  const youtube = YOUTUBE.exec(url)?.[1]
  if (youtube)
    return {
      kind: 'youtube',
      id: youtube,
      embedUrl: `https://www.youtube-nocookie.com/embed/${youtube}?autoplay=1&rel=0&playsinline=1`,
    }
  const vimeo = VIMEO.exec(url)?.[1]
  if (vimeo)
    return {
      kind: 'vimeo',
      id: vimeo,
      embedUrl: `https://player.vimeo.com/video/${vimeo}?autoplay=1&dnt=1`,
    }
  return { kind: 'file', url }
}
