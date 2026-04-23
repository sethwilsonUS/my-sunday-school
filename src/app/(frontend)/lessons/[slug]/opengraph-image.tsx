import { ImageResponse } from 'next/og'

import { getPublishedLessonBySlug } from '@/lib/lessons'
import {
  LessonFallbackSocialCard,
  LessonSocialCard,
  ogContentType,
  ogSize,
} from '@/lib/social-image'
import { fetchImageDataUrl, getFirstLessonArtworkUrl } from '@/lib/share'

type ImageProps = {
  params: Promise<{
    slug: string
  }>
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const alt = 'Lesson sharing image'
export const size = ogSize
export const contentType = ogContentType

export default async function OpenGraphImage({ params }: ImageProps) {
  const { slug } = await params
  const lesson = await getPublishedLessonBySlug(slug)

  if (!lesson) {
    return new ImageResponse(<LessonFallbackSocialCard title="Lesson not found" />, {
      ...ogSize,
    })
  }

  const artworkDataUrl = await fetchImageDataUrl(getFirstLessonArtworkUrl(lesson))

  return new ImageResponse(
    artworkDataUrl ? (
      <LessonSocialCard artworkSrc={artworkDataUrl} />
    ) : (
      <LessonFallbackSocialCard title={lesson.title} />
    ),
    {
      ...ogSize,
    },
  )
}
