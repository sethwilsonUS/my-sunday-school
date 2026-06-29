// @vitest-environment node

import { describe, expect, it } from 'vitest'

import {
  buildLessonSyncData,
  chooseLessonSyncTarget,
  getAltText,
  getCaption,
  getMediaData,
  getMediaDataChanges,
  getProposedFilename,
  mergeArtworkRowCaption,
  normalizeSourceLectionaryUrl,
  parseArtLinks,
  type ExistingLessonForSync,
  type LessonArtworkRowForSync,
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

type TestArtworkRow = LessonArtworkRowForSync<number> & {
  id?: string
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
    const target = chooseLessonSyncTarget(syncInput, [{ ...draftLesson, status: 'published' }])

    expect(target.action).toBe('blocked-published')
    expect(target.matchReason).toBe('source-url-date')
  })

  it('allows published matches only for explicit art-only updates', () => {
    const target = chooseLessonSyncTarget(syncInput, [{ ...draftLesson, status: 'published' }], {
      allowPublishedArtUpdate: true,
    })

    expect(target.action).toBe('update-published-art')
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
      observanceType: 'sunday',
      slug: '2026-05-10-easter-6a',
      sourceLectionaryUrl: 'https://episcopalchurch.org/lectionary/easter-6a',
      status: 'draft',
      title: 'Known, Near, and Not Orphaned',
    })
  })

  it('plans holy day lesson sync data when provided', () => {
    const data = buildLessonSyncData({
      ...syncInput,
      lectionaryYear: undefined,
      observanceType: 'holy-day',
      slug: '2026-05-31-the-visitation',
      sourceUrl: 'https://www.episcopalchurch.org/lectionary/visitation/',
      title: 'The Visitation of the Blessed Virgin Mary',
    })

    expect(data).toMatchObject({
      lectionaryYear: undefined,
      observanceType: 'holy-day',
      sourceLectionaryUrl: 'https://episcopalchurch.org/lectionary/visitation',
      title: 'The Visitation of the Blessed Virgin Mary',
    })
  })

  it('uses accessibility descriptions from art links as media alt text', () => {
    const [artwork] = parseArtLinks(
      [
        '## Raphael, *St Paul Preaching at Athens*, c. 1515-1516',
        '',
        '- Source: https://example.test/source',
        '- Image: https://example.test/image.jpg',
        '- Medium: Tapestry cartoon',
        '- Accessibility description: Paul stands before a group of listeners in Athens.',
        '- Description: Paul meets his listeners where they are before naming the unknown God.',
      ].join('\n'),
    )

    expect(getAltText(artwork)).toBe('Paul stands before a group of listeners in Athens.')
    expect(artwork.medium).toBe('Tapestry cartoon')
    expect(artwork.description).toBe(
      'Paul meets his listeners where they are before naming the unknown God.',
    )
    expect(getCaption(artwork)).toBe(
      'Paul meets his listeners where they are before naming the unknown God.',
    )
  })

  it('keeps artwork title and lesson theme as separate media metadata', () => {
    const [artwork] = parseArtLinks(
      [
        '## Domenico Gargiulo, *Rebecca and Eliezer at the Well*, 17th century',
        '',
        '- Source: https://example.test/source',
        '- Image: https://example.test/image.jpg',
        '- Medium: Oil painting',
        '- Accessibility description: Rebekah and Abraham’s servant meet beside a crowded well.',
        '- Theme: Providence, hospitality, and consent',
      ].join('\n'),
    )

    expect(artwork.title).toBe('Rebecca and Eliezer at the Well')
    expect(artwork.theme).toBe('Providence, hospitality, and consent')
    expect(getCaption(artwork)).toBe('Providence, hospitality, and consent')
    expect(getMediaData(artwork)).toEqual({
      altText: 'Rebekah and Abraham’s servant meet beside a crowded well.',
      artist: 'Domenico Gargiulo',
      medium: 'Oil painting',
      theme: 'Providence, hospitality, and consent',
      title: 'Rebecca and Eliezer at the Well',
      wikimediaUrl: 'https://example.test/source',
      workDate: '17th century',
    })
  })

  it('plans existing media metadata updates when title and theme are missing', () => {
    const [artwork] = parseArtLinks(
      [
        '## Domenico Gargiulo, *Rebecca and Eliezer at the Well*, 17th century',
        '',
        '- Source: https://example.test/source',
        '- Image: https://example.test/image.jpg',
        '- Accessibility description: Rebekah and Abraham’s servant meet beside a crowded well.',
        '- Theme: Providence, hospitality, and consent',
      ].join('\n'),
    )

    expect(
      getMediaDataChanges(
        {
          altText: 'Rebekah and Abraham’s servant meet beside a crowded well.',
          artist: 'Domenico Gargiulo',
          wikimediaUrl: 'https://example.test/source',
          workDate: '17th century',
        },
        artwork,
      ),
    ).toEqual({
      theme: 'Providence, hospitality, and consent',
      title: 'Rebecca and Eliezer at the Well',
    })

    expect(getMediaDataChanges(getMediaData(artwork), artwork)).toEqual({})
  })

  it('keeps legacy Description-only art links as alt text instead of captions', () => {
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
    expect(artwork.description).toBeUndefined()
    expect(getCaption(artwork)).toBe('Raphael, St Paul Preaching at Athens (c. 1515-1516)')
  })
})

describe('lesson sync artwork rows', () => {
  it('refreshes captions for artwork rows that already have matching media', () => {
    const rows: TestArtworkRow[] = [
      {
        id: 'row-1',
        image: 122,
        caption: 'El Greco, The Pentecost (c. 1596-1600)',
      },
      {
        id: 'row-2',
        image: { id: 150 },
        caption: 'Bruegel old caption',
      },
    ]

    const change = mergeArtworkRowCaption(
      rows,
      122 as number,
      'The apostles and Mary press together beneath a descending dove and tongues of fire.',
      (image, caption) => ({ image, caption }),
    )

    expect(change).toBe('updated')
    expect(rows[0]).toEqual({
      id: 'row-1',
      image: 122,
      caption:
        'The apostles and Mary press together beneath a descending dove and tongues of fire.',
    })
    expect(rows).toHaveLength(2)
  })

  it('adds a row only when no matching media is already attached', () => {
    const rows: TestArtworkRow[] = [
      {
        id: 'row-1',
        image: { id: 122 },
        caption: 'Existing caption',
      },
    ]

    const change = mergeArtworkRowCaption(
      rows,
      150 as number,
      'Bruegel gives Pentecost a visual foil.',
      (image, caption) => ({ image, caption }),
    )

    expect(change).toBe('added')
    expect(rows).toEqual([
      {
        id: 'row-1',
        image: { id: 122 },
        caption: 'Existing caption',
      },
      {
        image: 150,
        caption: 'Bruegel gives Pentecost a visual foil.',
      },
    ])
  })
})

describe('lesson sync artwork filenames', () => {
  it('uses the resolved MIME type instead of a misleading upload URL extension', () => {
    const [artwork] = parseArtLinks(
      [
        '## Gustave Dore, *The Creation of Light*, 1866',
        '',
        '- Source: https://commons.wikimedia.org/wiki/File:Creation_of_Light.png',
        '- Image: https://example.test/preview.jpg',
      ].join('\n'),
    )

    expect(
      getProposedFilename(artwork, 'image/jpeg', 'https://upload.wikimedia.org/original.png'),
    ).toBe('gustave-dore-the-creation-of-light-1866.jpg')
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
        '- Source: <https://example.test/source>',
        '- Image: [small](https://example.test/small.jpg)',
        '- Local file: /Users/sethwilson/dev/garden-mission-control/lessons/runs/easter-6a/_work/verified-images/work.jpg',
        '- Higher-resolution alternate image: <https://example.test/large.jpg>',
        '- Higher-resolution alternate source: https://example.test/large-source.',
      ].join('\n'),
    )

    expect(artwork.sourceUrl).toBe('https://example.test/source')
    expect(artwork.imageUrl).toBe('https://example.test/small.jpg')
    expect(artwork.localFilePath).toBe(
      '/Users/sethwilson/dev/garden-mission-control/lessons/runs/easter-6a/_work/verified-images/work.jpg',
    )
    expect(artwork.alternateImageUrl).toBe('https://example.test/large.jpg')
    expect(artwork.alternateSourceUrl).toBe('https://example.test/large-source')
  })
})
