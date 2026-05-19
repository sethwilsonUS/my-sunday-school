// @vitest-environment node

import { describe, expect, it } from 'vitest'

import {
  buildLessonSyncData,
  chooseLessonSyncTarget,
  getAltText,
  getProposedFilename,
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

describe('lesson sync artwork filenames', () => {
  it('can derive the media filename extension from the resolved upload URL', () => {
    const [artwork] = parseArtLinks(
      [
        '## Gustave Dore, *The Creation of Light*, 1866',
        '',
        '- Source: https://commons.wikimedia.org/wiki/File:Creation_of_Light.png',
        '- Image: https://example.test/preview.jpg',
      ].join('\n'),
    )

    expect(getProposedFilename(artwork, 'image/png', 'https://upload.wikimedia.org/original.png')).toBe(
      'gustave-dore-the-creation-of-light-1866.png',
    )
  })

  it('can derive the media filename extension from resolved MIME type', () => {
    const [artwork] = parseArtLinks(
      [
        '## Artist, *Work*, 1900',
        '',
        '- Source: https://example.test/source',
        '- Image: https://example.test/preview',
      ].join('\n'),
    )

    expect(getProposedFilename(artwork, 'image/avif', 'https://example.test/original')).toBe(
      'artist-work-1900.avif',
    )
    expect(getProposedFilename(artwork, 'image/svg+xml', 'https://example.test/original')).toBe(
      'artist-work-1900.svg',
    )
  })

  it('parses higher-resolution alternate art-link fields for resolver input', () => {
    const [artwork] = parseArtLinks(
      [
        '## Artist, *Work*, 1900',
        '',
        '- Source: https://example.test/source',
        '- Image: https://example.test/small.jpg',
        '- Higher-resolution alternate image: https://example.test/large.jpg',
        '- Higher-resolution alternate source: https://example.test/large-source',
      ].join('\n'),
    )

    expect(artwork.alternateImageUrl).toBe('https://example.test/large.jpg')
    expect(artwork.alternateSourceUrl).toBe('https://example.test/large-source')
  })
})
