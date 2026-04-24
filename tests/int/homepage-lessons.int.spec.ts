import { describe, expect, it } from 'vitest'

import { splitLessonsForHomepage } from '@/lib/homepage-lessons'

describe('splitLessonsForHomepage', () => {
  it('features the lesson closest to today on or after today', () => {
    const lessons = [
      { date: '2026-05-10', slug: 'later-future' },
      { date: '2026-04-26', slug: 'upcoming-sunday' },
      { date: '2026-04-19', slug: 'recent-past' },
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
      { date: '2026-04-12', slug: 'older-past' },
      { date: '2026-04-19', slug: 'most-recent-past' },
    ]

    const result = splitLessonsForHomepage(lessons, new Date('2026-04-24T12:00:00Z'))

    expect(result.featuredLesson?.slug).toBe('most-recent-past')
    expect(result.featuredLessonContext).toBe('past')
    expect(result.supportingLessons.map((lesson) => lesson.slug)).toEqual(['older-past'])
  })
})
