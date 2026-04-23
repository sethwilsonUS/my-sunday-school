import type { Media } from '@/payload-types'

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

export const getMediaUrl = (media: Media | number | null | undefined): string | null => {
  const resolved = getMedia(media)

  return resolved?.url ?? null
}
