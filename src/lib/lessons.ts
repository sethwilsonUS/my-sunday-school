import config from '@payload-config'
import { getPayload, type Where } from 'payload'

import type { Lesson } from '@/payload-types'

import { getNextDateKey } from './lesson-dates'
import type { LiturgicalSeason } from './liturgical-themes'
import { compareLessonObservance, type ObservanceType } from './observance-types'

export type LessonFilters = {
  observanceType?: ObservanceType
  season?: LiturgicalSeason
  year?: 'A' | 'B' | 'C'
}

export type LessonSummary = Pick<
  Lesson,
  | 'artworks'
  | 'date'
  | 'id'
  | 'lectionaryYear'
  | 'liturgicalSeason'
  | 'observanceType'
  | 'scriptures'
  | 'slug'
  | 'studyQuestions'
  | 'title'
>

const publishedWhere = { status: { equals: 'published' } } satisfies Where
const lessonSummarySelect = {
  artworks: true,
  date: true,
  lectionaryYear: true,
  liturgicalSeason: true,
  observanceType: true,
  scriptures: true,
  slug: true,
  studyQuestions: true,
  title: true,
} as const

export const getPublishedLessons = async (
  filters: LessonFilters = {},
  limit = 100,
): Promise<LessonSummary[]> => {
  const payload = await getPayload({ config })
  const and: Where[] = [publishedWhere]

  if (filters.observanceType) {
    and.push({ observanceType: { equals: filters.observanceType } })
  }

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
    select: lessonSummarySelect,
    sort: '-date',
    where: { and },
  })

  return result.docs as LessonSummary[]
}

export const getPublishedLessonsByDate = async (
  dateKey: string,
  limit = 20,
): Promise<LessonSummary[]> => {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'lessons',
    depth: 1,
    limit,
    overrideAccess: false,
    select: lessonSummarySelect,
    sort: 'title',
    where: {
      and: [
        publishedWhere,
        { date: { greater_than_equal: dateKey } },
        { date: { less_than: getNextDateKey(dateKey) } },
      ],
    },
  })

  return (result.docs as LessonSummary[]).sort(compareLessonObservance)
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
