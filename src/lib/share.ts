import type { Lesson, Media } from '@/payload-types'

import { compact, getMedia } from './frontend'
import { formatLessonDate } from './frontend'
import { getLiturgicalTheme } from './liturgical-themes'

export const SITE_NAME = 'Lectionary Lessons'
export const SITE_SUBTITLE = 'Revised Common Lectionary'
export const SITE_TAGLINE =
  'Scripture, art, study questions, and musings for the Revised Common Lectionary.'
export const SITE_DESCRIPTION = SITE_TAGLINE
export const SITE_PUBLISHER =
  'the Sunday Adult Lectionary Class at St. Francis Episcopal Church in Tyler'

export const OPEN_GRAPH_SIZE = {
  width: 1200,
  height: 630,
} as const

const withProtocol = (value: string | null | undefined) => {
  if (!value) {
    return null
  }

  const normalized = value.trim().replace(/\/+$/, '')

  if (!normalized) {
    return null
  }

  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return normalized
  }

  return `https://${normalized}`
}

export const getSiteOrigin = () =>
  withProtocol(process.env.SITE_URL) ??
  withProtocol(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
  withProtocol(process.env.VERCEL_BRANCH_URL) ??
  withProtocol(process.env.VERCEL_URL) ??
  withProtocol(process.env.PORT ? `http://localhost:${process.env.PORT}` : null) ??
  'http://localhost:3000'

export const getMetadataBase = () => new URL(getSiteOrigin())

export const getSiteHostLabel = () => getMetadataBase().hostname.replace(/^www\./, '')

export const toAbsoluteUrl = (value: string | null | undefined) => {
  if (!value) {
    return null
  }

  try {
    return new URL(value).toString()
  } catch {
    return new URL(value, getSiteOrigin()).toString()
  }
}

export const getCanonicalUrl = (pathname = '/') => new URL(pathname, getSiteOrigin()).toString()

export const getLessonPath = (slug: string) => `/lessons/${slug}`

export const getLessonOpenGraphPath = (slug: string) => `${getLessonPath(slug)}/opengraph-image`

export const getLessonMetadataLabel = (
  lesson: Pick<Lesson, 'date' | 'lectionaryYear' | 'liturgicalSeason'>,
) => {
  const seasonLabel = getLiturgicalTheme(lesson.liturgicalSeason).label
  const yearLabel = lesson.lectionaryYear ? ` Year ${lesson.lectionaryYear}` : ''

  return `${seasonLabel}${yearLabel}, ${formatLessonDate(lesson.date)}`
}

export const getFirstLessonArtwork = (lesson: Pick<Lesson, 'artworks'>): Media | null => {
  const firstArtwork = compact(lesson.artworks)[0]

  return getMedia(firstArtwork?.image)
}

export const getFirstLessonArtworkUrl = (lesson: Pick<Lesson, 'artworks'>) =>
  toAbsoluteUrl(getFirstLessonArtwork(lesson)?.url)

export const fetchImageDataUrl = async (imageUrl: string | null | undefined) => {
  const absoluteUrl = toAbsoluteUrl(imageUrl)

  if (!absoluteUrl) {
    return null
  }

  try {
    const response = await fetch(absoluteUrl)

    if (!response.ok) {
      return null
    }

    const mimeType = response.headers.get('content-type') ?? 'image/jpeg'
    const imageBuffer = Buffer.from(await response.arrayBuffer())

    return `data:${mimeType};base64,${imageBuffer.toString('base64')}`
  } catch {
    return null
  }
}
