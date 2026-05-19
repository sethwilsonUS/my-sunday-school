// @vitest-environment node

import { describe, expect, it } from 'vitest'

import {
  buildLessonSyncData,
  chooseLessonSyncTarget,
  getAltText,
  normalizeSourceLectionaryUrl,
  parseArtLinks,
  type ExistingLessonForSync,
  type LessonSyncInput,
} from '../../scripts/lesson-sync-helpers'

const syncInput: LessonSyncInput = {
  collect: 'O God, the King of glory, do not leave us comfortless. Amen.',
  date: '2026-05-10',
  lectionaryYear: 'A',
  liturgicalSeason: 'easter',
  slug: '2026-05-10-easter-6a',
  sourceUrl: 'https://www.EpiscopalChurch.org/lectionary/Easter-6A/?utm=mail#collect',
  title: 'Known, Near, and Not Orphaned',
}

const draftLesson: ExistingLessonForSync = {
  id: 101,
  date: '2026-05-10T00:00:00.000Z',
  slug: 'older-slug',
  sourceLectionaryUrl: 'https://episcopalchurch.org/lectionary/easter-6a/',
  status: 'draft',
  title: 'Older title',
}

describe('lesson sync planning', () => {
  it('normalizes source lectionary URLs for idempotent matching', () => {
    expect(normalizeSourceLectionaryUrl(syncInput.sourceUrl)).toBe(
      'https://episcopalchurch.org/lectionary/easter-6a',
    )
  })

  it('prefers source URL plus date over slug fallback', () => {
    const target = chooseLessonSyncTarget(syncInput, [
      { ...draftLesson, slug: 'not-the-new-slug' },
      { ...draftLesson, id: 202, sourceLectionaryUrl: undefined, slug: syncInput.slug },
    ])

    expect(target.action).toBe('update-draft')
    expect(target.matchReason).toBe('source-url-date')
    expect(target.lesson?.id).toBe(101)
  })

  it('falls back to a draft slug match when no source URL/date match exists', () => {
    const target = chooseLessonSyncTarget(syncInput, [
      { ...draftLesson, id: 202, sourceLectionaryUrl: undefined, slug: syncInput.slug },
    ])

    expect(target.action).toBe('update-draft')
    expect(target.matchReason).toBe('slug')
    expect(target.lesson?.id).toBe(202)
  })

  it('blocks published matches by default', () => {
    const target = chooseLessonSyncTarget(syncInput, [
      { ...draftLesson, status: 'published' },
    ])

    expect(target.action).toBe('blocked-published')
    expect(target.matchReason).toBe('source-url-date')
  })

  it('plans a draft create when no match exists', () => {
    const target = chooseLessonSyncTarget(syncInput, [])
    const data = buildLessonSyncData(syncInput)

    expect(target.action).toBe('create-draft')
    expect(data).toMatchObject({
      date: '2026-05-10',
      collect: 'O God, the King of glory, do not leave us comfortless. Amen.',
      lectionaryYear: 'A',
      liturgicalSeason: 'easter',
      slug: '2026-05-10-easter-6a',
      sourceLectionaryUrl: 'https://episcopalchurch.org/lectionary/easter-6a',
      status: 'draft',
      title: 'Known, Near, and Not Orphaned',
    })
  })

  it('uses accessibility descriptions from art links as media alt text', () => {
    const [artwork] = parseArtLinks(
      [
        '## Raphael, *St Paul Preaching at Athens*, c. 1515-1516',
        '',
        '- Source: https://example.test/source',
        '- Image: https://example.test/image.jpg',
        '- Description: Paul stands before a group of listeners in Athens.',
      ].join('\n'),
    )

    expect(getAltText(artwork)).toBe('Paul stands before a group of listeners in Athens.')
  })
})
