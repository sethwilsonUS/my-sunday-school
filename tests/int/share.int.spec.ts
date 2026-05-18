import { describe, expect, it } from 'vitest'

import type { Lesson, Media } from '@/payload-types'
import { getFirstLessonArtworkUrl, getLessonOpenGraphPath, getLessonOpenGraphUrl } from '@/lib/share'

const makeMedia = (overrides: Partial<Media>): Media => ({
  altText: 'Test artwork',
  createdAt: '2026-04-28T00:00:00.000Z',
  id: 1,
  updatedAt: '2026-04-28T00:00:00.000Z',
  ...overrides,
})

const makeLesson = (image: Media): Pick<Lesson, 'artworks'> => ({
  artworks: [{ image }],
})

describe('getFirstLessonArtworkUrl', () => {
  it('uses the first artwork and prefers the large generated size', () => {
    const firstArtwork = makeMedia({
      sizes: {
        card: {
          height: 640,
          url: 'https://cdn.example.com/first-card.jpg',
          width: 480,
        },
        large: {
          height: 1280,
          url: 'https://cdn.example.com/first-large.jpg',
          width: 960,
        },
      },
      url: 'https://cdn.example.com/first-original.jpg',
    })
    const secondArtwork = makeMedia({
      id: 2,
      sizes: {
        large: {
          height: 1280,
          url: 'https://cdn.example.com/second-large.jpg',
          width: 960,
        },
      },
      url: 'https://cdn.example.com/second-original.jpg',
    })

    expect(
      getFirstLessonArtworkUrl({
        artworks: [{ image: firstArtwork }, { image: secondArtwork }],
      }),
    ).toBe('https://cdn.example.com/first-large.jpg')
  })

  it('falls back to the original image URL when generated sizes are missing', () => {
    const artwork = makeMedia({
      url: 'https://cdn.example.com/original-only.jpg',
    })

    expect(getFirstLessonArtworkUrl(makeLesson(artwork))).toBe(
      'https://cdn.example.com/original-only.jpg',
    )
  })
})

describe('lesson Open Graph image URLs', () => {
  it('uses a stable PNG route for crawlers that dislike generated metadata URLs', () => {
    expect(getLessonOpenGraphPath('2026-05-24-day-of-pentecost-a')).toBe(
      '/lessons/2026-05-24-day-of-pentecost-a/opengraph-image.png',
    )
  })

  it('can version the social image URL when lesson content changes', () => {
    const url = new URL(getLessonOpenGraphUrl('pentecost', '2026-05-18T22:00:00.000Z'))

    expect(url.pathname).toBe('/lessons/pentecost/opengraph-image.png')
    expect(url.searchParams.get('v')).toBe('2026-05-18T22:00:00.000Z')
  })
})
