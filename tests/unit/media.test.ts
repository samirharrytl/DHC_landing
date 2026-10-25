import { describe, expect, it } from 'vitest'
import { parseVideo } from '../../src/lib/media'

describe('parseVideo', () => {
  it('reconoce los formatos de link de YouTube y usa el reproductor sin cookies', () => {
    for (const url of [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtube.com/watch?feature=share&v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://www.youtube.com/shorts/dQw4w9WgXcQ',
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    ]) {
      expect(parseVideo(url)).toMatchObject({ kind: 'youtube', id: 'dQw4w9WgXcQ' })
    }
    expect(parseVideo('https://youtu.be/dQw4w9WgXcQ')).toMatchObject({
      embedUrl: expect.stringContaining('youtube-nocookie.com/embed/dQw4w9WgXcQ'),
    })
  })

  it('reconoce Vimeo', () => {
    expect(parseVideo('https://vimeo.com/76979871')).toMatchObject({
      kind: 'vimeo',
      id: '76979871',
      embedUrl: 'https://player.vimeo.com/video/76979871?autoplay=1&dnt=1',
    })
  })

  it('cualquier otro link es un archivo de video', () => {
    expect(parseVideo('/videos/recorrido.webm')).toEqual({ kind: 'file', url: '/videos/recorrido.webm' })
    expect(parseVideo('https://media.depahostperu.com/tour.mp4')).toEqual({
      kind: 'file',
      url: 'https://media.depahostperu.com/tour.mp4',
    })
  })
})
