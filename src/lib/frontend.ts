import type { Media } from '@/payload-types'

export type MediaImageSize = 'thumbnail' | 'card' | 'large'

export type MediaImageSource = {
  height?: number | null
  src: string
  width?: number | null
}

export const formatLessonDate = (date: string) =>
  new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(new Date(date))

export const formatShortDate = (date: string) =>
  new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(new Date(date))

export const compact = <T>(items: T[] | null | undefined): T[] => items ?? []

export const getMedia = (media: Media | number | null | undefined): Media | null =>
  typeof media === 'object' && media !== null ? media : null

export const getMediaImageSource = (
  media: Media | number | null | undefined,
  preferredSizes: MediaImageSize[] = ['card', 'large', 'thumbnail'],
): MediaImageSource | null => {
  const resolved = getMedia(media)

  if (!resolved) {
    return null
  }

  for (const sizeName of preferredSizes) {
    const size = resolved.sizes?.[sizeName]

    if (size?.url) {
      return {
        height: size.height,
        src: size.url,
        width: size.width,
      }
    }
  }

  if (!resolved.url) {
    return null
  }

  return {
    height: resolved.height,
    src: resolved.url,
    width: resolved.width,
  }
}
