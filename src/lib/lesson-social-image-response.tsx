import { ImageResponse } from 'next/og'

import { getPublishedLessonBySlug } from '@/lib/lessons'
import {
  LessonFallbackSocialCard,
  LessonSocialCard,
  ogSize,
} from '@/lib/social-image'
import { fetchImageDataUrl, getFirstLessonArtworkUrl, getLessonMetadataLabel } from '@/lib/share'

const socialImageHeaders = {
  'Cache-Control': 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800',
}

export async function createLessonSocialImageResponse(slug: string) {
  const lesson = await getPublishedLessonBySlug(slug)

  if (!lesson) {
    return new ImageResponse(<LessonFallbackSocialCard title="Lesson not found" />, {
      ...ogSize,
      headers: socialImageHeaders,
    })
  }

  const artworkDataUrl = await fetchImageDataUrl(getFirstLessonArtworkUrl(lesson))
  const metadataLabel = getLessonMetadataLabel(lesson)

  return new ImageResponse(
    artworkDataUrl ? (
      <LessonSocialCard artworkSrc={artworkDataUrl} metadataLabel={metadataLabel} title={lesson.title} />
    ) : (
      <LessonFallbackSocialCard metadataLabel={metadataLabel} title={lesson.title} />
    ),
    {
      ...ogSize,
      headers: socialImageHeaders,
    },
  )
}
