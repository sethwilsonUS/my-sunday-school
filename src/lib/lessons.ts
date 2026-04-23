import config from '@payload-config'
import { getPayload, type Where } from 'payload'

import type { Lesson } from '@/payload-types'

import type { LiturgicalSeason } from './liturgical-themes'

export type LessonFilters = {
  season?: LiturgicalSeason
  year?: 'A' | 'B' | 'C'
}

const publishedWhere = { status: { equals: 'published' } } satisfies Where

export const getPublishedLessons = async (filters: LessonFilters = {}, limit = 100) => {
  const payload = await getPayload({ config })
  const and: Where[] = [publishedWhere]

  if (filters.season) {
    and.push({ liturgicalSeason: { equals: filters.season } })
  }

  if (filters.year) {
    and.push({ lectionaryYear: { equals: filters.year } })
  }

  const result = await payload.find({
    collection: 'lessons',
    depth: 1,
    limit,
    overrideAccess: false,
    sort: '-date',
    where: { and },
  })

  return result.docs
}

export const getPublishedLessonBySlug = async (slug: string): Promise<Lesson | null> => {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'lessons',
    depth: 2,
    limit: 1,
    overrideAccess: false,
    where: {
      and: [publishedWhere, { slug: { equals: slug } }],
    },
  })

  return result.docs[0] ?? null
}
