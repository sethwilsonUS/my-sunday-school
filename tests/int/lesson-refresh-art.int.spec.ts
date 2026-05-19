// @vitest-environment node

import { describe, expect, it } from 'vitest'

import {
  getRefreshAction,
  parseRefreshArtArgs,
  refreshFilenameForMedia,
  type RefreshMediaSummary,
} from '../../scripts/lesson-refresh-art-helpers'

const media = (overrides: Partial<RefreshMediaSummary> = {}): RefreshMediaSummary => ({
  artist: 'El Greco',
  filename: 'el-greco-the-pentecost-c-1596-1600.jpg',
  height: 1492,
  id: 122,
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:El_Greco_-_The_Pentecost_-_WGA10533.jpg',
  title: 'The Pentecost',
  width: 700,
  workDate: 'c. 1596-1600',
  ...overrides,
})

describe('lesson refresh art helpers', () => {
  it('parses slug and published dry-run scopes', () => {
    expect(parseRefreshArtArgs(['--slug', '2026-05-24-day-of-pentecost-a'])).toMatchObject({
      confirmSharedDB: false,
      published: false,
      slug: '2026-05-24-day-of-pentecost-a',
      write: false,
    })

    expect(parseRefreshArtArgs(['--published', '--limit', '5'])).toMatchObject({
      limit: 5,
      published: true,
      write: false,
    })

    expect(parseRefreshArtArgs(['--ids', '122,123,126'])).toMatchObject({
      ids: [122, 123, 126],
      write: false,
    })

    expect(parseRefreshArtArgs(['--slug=alpha=beta'])).toMatchObject({
      slug: 'alpha=beta',
      write: false,
    })
  })

  it('rejects empty id entries', () => {
    expect(() => parseRefreshArtArgs(['--ids', '1,,2'])).toThrow('--ids must be a positive integer.')
    expect(() => parseRefreshArtArgs(['--ids', ','])).toThrow('--ids must be a positive integer.')
  })

  it('rejects inline values for boolean flags', () => {
    expect(() => parseRefreshArtArgs(['--write=false'])).toThrow('--write does not accept a value.')
    expect(() => parseRefreshArtArgs(['--confirm-shared-db=false'])).toThrow(
      '--confirm-shared-db does not accept a value.',
    )
    expect(() => parseRefreshArtArgs(['--published=false'])).toThrow('--published does not accept a value.')
  })

  it('rejects non-decimal positive integer values', () => {
    expect(() => parseRefreshArtArgs(['--ids', '1e3'])).toThrow('--ids must be a positive integer.')
    expect(() => parseRefreshArtArgs(['--limit', '0x10'])).toThrow('--limit must be a positive integer.')
    expect(() => parseRefreshArtArgs(['--start-after', '01'])).toThrow(
      '--start-after must be a positive integer.',
    )
  })

  it('requires confirmation for write mode and a bounded scope', () => {
    expect(() => parseRefreshArtArgs(['--write', '--slug', 'pentecost'])).toThrow(
      'Write mode requires --confirm-shared-db.',
    )

    expect(() => parseRefreshArtArgs(['--write', '--confirm-shared-db', '--published'])).toThrow(
      'Write mode requires --slug, --ids, or --limit for a bounded scope.',
    )
  })

  it('plans refresh only when the resolved candidate is materially better', () => {
    expect(
      getRefreshAction(media(), {
        dimensions: { width: 1600, height: 2400 },
        url: 'https://example.test/better.jpg',
      }),
    ).toEqual({ action: 'refresh', reason: 'candidate is materially better' })

    expect(
      getRefreshAction(media({ width: 1800, height: 2400 }), {
        dimensions: { width: 1600, height: 2100 },
        url: 'https://example.test/smaller.jpg',
      }),
    ).toEqual({ action: 'skip', reason: 'candidate is not materially better' })
  })

  it('preserves the current filename when MIME type extension matches', () => {
    expect(refreshFilenameForMedia(media(), 'image/jpeg')).toBe(
      'el-greco-the-pentecost-c-1596-1600.jpg',
    )

    expect(refreshFilenameForMedia(media({ filename: 'creation.png' }), 'image/jpeg')).toBe(
      'creation.jpg',
    )

    expect(refreshFilenameForMedia(media({ filename: undefined }), 'image/png')).toBe('artwork.png')
    expect(refreshFilenameForMedia(media({ filename: 'Creation.JPG' }), 'image/jpeg')).toBe('Creation.JPG')
    expect(refreshFilenameForMedia(media({ filename: 'creation.webp' }), 'application/octet-stream')).toBe(
      'creation.jpg',
    )
  })
})
