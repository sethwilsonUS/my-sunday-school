// @vitest-environment node

import { describe, expect, it } from 'vitest'

import {
  formatRefreshSummary,
  getRefreshExitCode,
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

  it('parses slow mode and explicit retry controls', () => {
    expect(parseRefreshArtArgs(['--published', '--slow'])).toMatchObject({
      published: true,
      retryCount: 2,
      retryDelayMs: 5000,
      maxRetryDelayMs: 30000,
      slow: true,
      targetDelayMs: 3000,
    })

    expect(
      parseRefreshArtArgs([
        '--published',
        '--slow',
        '--retry-count',
        '5',
        '--retry-delay-ms',
        '10000',
        '--max-retry-delay-ms',
        '4000',
        '--target-delay-ms',
        '7000',
      ]),
    ).toMatchObject({
      maxRetryDelayMs: 4000,
      retryCount: 5,
      retryDelayMs: 10000,
      targetDelayMs: 7000,
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

  it('rejects invalid retry controls', () => {
    expect(() => parseRefreshArtArgs(['--slow=false'])).toThrow('--slow does not accept a value.')
    expect(() => parseRefreshArtArgs(['--retry-count', '-1'])).toThrow(
      '--retry-count must be a non-negative integer.',
    )
    expect(() => parseRefreshArtArgs(['--retry-delay-ms', '1.5'])).toThrow(
      '--retry-delay-ms must be a non-negative integer.',
    )
    expect(() => parseRefreshArtArgs(['--max-retry-delay-ms', '-1'])).toThrow(
      '--max-retry-delay-ms must be a non-negative integer.',
    )
    expect(() => parseRefreshArtArgs(['--target-delay-ms', '1e3'])).toThrow(
      '--target-delay-ms must be a non-negative integer.',
    )
  })

  it('requires confirmation for write mode and a bounded scope', () => {
    expect(() => parseRefreshArtArgs(['--write', '--slug', 'pentecost'])).toThrow(
      'Write mode requires --confirm-shared-db.',
    )

    expect(() => parseRefreshArtArgs(['--write', '--confirm-shared-db'])).toThrow(
      'Write mode requires --slug, --ids, or --published for a target scope.',
    )

    expect(parseRefreshArtArgs(['--write', '--confirm-shared-db', '--published'])).toMatchObject({
      published: true,
      write: true,
    })
  })

  it('rejects blank slugs and standalone limits', () => {
    expect(() => parseRefreshArtArgs(['--slug', '   '])).toThrow('--slug requires a non-empty value.')
    expect(() => parseRefreshArtArgs(['--limit', '5'])).toThrow(
      '--limit requires --published, --slug, or --ids.',
    )
  })

  it('reports unresolved candidates separately from normal skips', () => {
    expect(
      formatRefreshSummary({
        failures: 0,
        refreshed: 0,
        skipped: 21,
        unresolved: 8,
        wouldRefresh: 1,
        write: false,
      }),
    ).toBe('Dry run complete. Would refresh: 1. Refreshed: 0. Skipped: 21. Unresolved: 8. Failures: 0.')

    expect(getRefreshExitCode({ failures: 0, unresolved: 0 })).toBe(0)
    expect(getRefreshExitCode({ failures: 0, unresolved: 1 })).toBe(2)
    expect(getRefreshExitCode({ failures: 1, unresolved: 0 })).toBe(1)
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
