import config from '@payload-config'
import { getPayload, type Where } from 'payload'

import type { Lesson } from '@/payload-types'

import { getNextDateKey } from './lesson-dates'
import type { LiturgicalSeason } from './liturgical-themes'
import {
  compareLessonObservance,
  DEFAULT_OBSERVANCE_TYPE,
  type ObservanceType,
} from './observance-types'

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
const legacyLessonSummarySelect = {
  artworks: true,
  date: true,
  lectionaryYear: true,
  liturgicalSeason: true,
  scriptures: true,
  slug: true,
  studyQuestions: true,
  title: true,
} as const
const legacyLessonDetailSelect = {
  artworks: true,
  collect: true,
  date: true,
  lectionaryYear: true,
  links: true,
  liturgicalSeason: true,
  musings: true,
  quotes: true,
  scriptures: true,
  slug: true,
  studyQuestions: true,
  title: true,
  updatedAt: true,
  videoLinks: true,
} as const

export const isMissingObservanceTypeColumn = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)

  return /observance_type/i.test(message) && /column|does not exist|42703/i.test(message)
}

const addDefaultObservanceType = <T extends object>(lesson: T) => ({
  ...lesson,
  observanceType: DEFAULT_OBSERVANCE_TYPE,
})

const buildPublishedLessonsWhere = (filters: LessonFilters, includeObservanceType: boolean) => {
  const and: Where[] = [publishedWhere]

  if (includeObservanceType && filters.observanceType) {
    and.push({ observanceType: { equals: filters.observanceType } })
  }

  if (filters.season) {
    and.push({ liturgicalSeason: { equals: filters.season } })
  }

  if (filters.year) {
    and.push({ lectionaryYear: { equals: filters.year } })
  }

  return { and }
}

export const getPublishedLessons = async (
  filters: LessonFilters = {},
  limit = 100,
): Promise<LessonSummary[]> => {
  const payload = await getPayload({ config })

  try {
    const result = await payload.find({
      collection: 'lessons',
      depth: 1,
      limit,
      overrideAccess: false,
      select: lessonSummarySelect,
      sort: '-date',
      where: buildPublishedLessonsWhere(filters, true),
    })

    return result.docs as LessonSummary[]
  } catch (error) {
    if (!isMissingObservanceTypeColumn(error)) {
      throw error
    }

    if (filters.observanceType && filters.observanceType !== DEFAULT_OBSERVANCE_TYPE) {
      return []
    }

    const result = await payload.find({
      collection: 'lessons',
      depth: 1,
      limit,
      overrideAccess: false,
      select: legacyLessonSummarySelect,
      sort: '-date',
      where: buildPublishedLessonsWhere(filters, false),
    })

    return result.docs.map(addDefaultObservanceType) as LessonSummary[]
  }
}

export const getPublishedLessonsByDate = async (
  dateKey: string,
  limit = 20,
): Promise<LessonSummary[]> => {
  const payload = await getPayload({ config })
  const where = {
    and: [
      publishedWhere,
      { date: { greater_than_equal: dateKey } },
      { date: { less_than: getNextDateKey(dateKey) } },
    ],
  }

  try {
    const result = await payload.find({
      collection: 'lessons',
      depth: 1,
      limit,
      overrideAccess: false,
      select: lessonSummarySelect,
      sort: 'title',
      where,
    })

    return (result.docs as LessonSummary[]).sort(compareLessonObservance)
  } catch (error) {
    if (!isMissingObservanceTypeColumn(error)) {
      throw error
    }

    const result = await payload.find({
      collection: 'lessons',
      depth: 1,
      limit,
      overrideAccess: false,
      select: legacyLessonSummarySelect,
      sort: 'title',
      where,
    })

    return (result.docs.map(addDefaultObservanceType) as LessonSummary[]).sort(
      compareLessonObservance,
    )
  }
}

export const getPublishedLessonBySlug = async (slug: string): Promise<Lesson | null> => {
  const payload = await getPayload({ config })

  try {
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
  } catch (error) {
    if (!isMissingObservanceTypeColumn(error)) {
      throw error
    }

    const result = await payload.find({
      collection: 'lessons',
      depth: 2,
      limit: 1,
      overrideAccess: false,
      select: legacyLessonDetailSelect,
      where: {
        and: [publishedWhere, { slug: { equals: slug } }],
      },
    })

    const lesson = result.docs[0]

    return lesson ? (addDefaultObservanceType(lesson) as Lesson) : null
  }
}
