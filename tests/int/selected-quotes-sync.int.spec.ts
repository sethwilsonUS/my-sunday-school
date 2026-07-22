// @vitest-environment node

import { describe, expect, it } from 'vitest'

import {
  planSelectedQuoteSync,
  selectedQuoteManifestDigest,
  validateSelectedQuoteManifest,
  validateSelectedQuoteManifestForWrite,
  type SelectedQuoteManifest,
} from '../../scripts/selected-quotes-sync'

function manifest(
  quotes: SelectedQuoteManifest['quotes'],
  generatedAt = '2026-07-16T12:00:00.000Z',
) {
  const value = {
    generatedAt,
    lessonKey: '2026-07-19-proper-11a',
    quotes,
    schemaVersion: 1 as const,
  }

  return { ...value, sha256: selectedQuoteManifestDigest(value) }
}

describe('selected Payload quote manifest', () => {
  it('detects content changes after the guarded dry run', () => {
    const approved = manifest([{ id: 'q1', text: 'Many are first tares and then become wheat.' }])

    expect(validateSelectedQuoteManifest(approved)).toEqual(approved)
    expect(() => validateSelectedQuoteManifestForWrite(approved)).toThrow(
      /requires --expect-quotes-sha/i,
    )
    expect(() => validateSelectedQuoteManifestForWrite(approved, 'f'.repeat(64))).toThrow(
      /changed after approval/i,
    )
    expect(() =>
      validateSelectedQuoteManifest({
        ...approved,
        quotes: [{ ...approved.quotes[0], text: 'Changed after review.' }],
      }),
    ).toThrow(/digest does not match/i)
  })

  it('ignores generatedAt when computing the approval digest', () => {
    const quotes = [{ id: 'q1', text: 'Returning hate for hate multiplies hate.' }]
    expect(manifest(quotes).sha256).toBe(manifest(quotes, '2026-07-16T13:00:00.000Z').sha256)
  })
})

describe('selected Payload quote merge', () => {
  const selected = manifest([
    {
      author: 'Augustine of Hippo',
      id: 'augustine',
      source: 'Sermon 73A, on the wheat and tares',
      text: 'Many are first tares and then become wheat.',
    },
    {
      author: 'Martin Luther King Jr.',
      id: 'king',
      source: 'Loving Your Enemies',
      text: 'Returning hate for hate multiplies hate.',
      year: '1957',
    },
  ])

  it('preserves manual rows, enriches matching rows, and appends missing selected quotes', () => {
    const plan = planSelectedQuoteSync(
      [
        { author: 'Manual Author', id: 'manual-row', text: 'A manually curated quote.' },
        { id: 'augustine-row', text: 'Many are first tares and then become wheat.' },
      ],
      selected,
    )

    expect(plan.added).toBe(1)
    expect(plan.enriched).toBe(1)
    expect(plan.rows).toEqual([
      { author: 'Manual Author', id: 'manual-row', text: 'A manually curated quote.' },
      {
        author: 'Augustine of Hippo',
        id: 'augustine-row',
        source: 'Sermon 73A, on the wheat and tares',
        text: 'Many are first tares and then become wheat.',
      },
      {
        author: 'Martin Luther King Jr.',
        source: 'Loving Your Enemies',
        text: 'Returning hate for hate multiplies hate.',
        year: '1957',
      },
    ])
  })

  it('is idempotent and does not overwrite curated metadata', () => {
    const first = planSelectedQuoteSync(
      [
        {
          author: 'Curated Augustine',
          source: 'A preferred citation',
          text: 'Many are first tares and then become wheat.',
        },
      ],
      selected,
    )
    const second = planSelectedQuoteSync(first.rows, selected)

    expect(first.rows[0]).toMatchObject({
      author: 'Curated Augustine',
      source: 'A preferred citation',
    })
    expect(second.added).toBe(0)
    expect(second.enriched).toBe(0)
    expect(second.rows).toEqual(first.rows)
  })
})
