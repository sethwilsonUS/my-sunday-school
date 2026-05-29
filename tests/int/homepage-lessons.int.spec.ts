import { describe, expect, it } from 'vitest'

import { splitLessonsForHomepage } from '@/lib/homepage-lessons'

describe('splitLessonsForHomepage', () => {
  it('features the lesson closest to today on or after today', () => {
    const lessons = [
      { date: '2026-05-10', observanceType: 'sunday', slug: 'later-future' },
      { date: '2026-04-26', observanceType: 'sunday', slug: 'upcoming-sunday' },
      { date: '2026-04-19', observanceType: 'sunday', slug: 'recent-past' },
    ]

    const result = splitLessonsForHomepage(lessons, new Date('2026-04-24T12:00:00Z'))

    expect(result.featuredLesson?.slug).toBe('upcoming-sunday')
    expect(result.featuredLessonContext).toBe('upcoming')
    expect(result.supportingLessons.map((lesson) => lesson.slug)).toEqual([
      'later-future',
      'recent-past',
    ])
  })

  it('falls back to the most recent past lesson when nothing upcoming exists', () => {
    const lessons = [
      { date: '2026-04-12', observanceType: 'sunday', slug: 'older-past' },
      { date: '2026-04-19', observanceType: 'sunday', slug: 'most-recent-past' },
    ]

    const result = splitLessonsForHomepage(lessons, new Date('2026-04-24T12:00:00Z'))

    expect(result.featuredLesson?.slug).toBe('most-recent-past')
    expect(result.featuredLessonContext).toBe('past')
    expect(result.supportingLessons.map((lesson) => lesson.slug)).toEqual(['older-past'])
  })

  it('keeps the homepage feature pinned to Sunday lessons', () => {
    const lessons = [
      { date: '2026-05-31', observanceType: 'holy-day', slug: 'visitation' },
      { date: '2026-06-07', observanceType: 'sunday', slug: 'trinity-sunday' },
      { date: '2026-05-24', observanceType: 'sunday', slug: 'pentecost' },
    ]

    const result = splitLessonsForHomepage(lessons, new Date('2026-05-29T12:00:00Z'))

    expect(result.featuredLesson?.slug).toBe('trinity-sunday')
    expect(result.featuredLessonContext).toBe('upcoming')
    expect(result.supportingLessons.map((lesson) => lesson.slug)).toEqual([
      'visitation',
      'pentecost',
    ])
  })
})
