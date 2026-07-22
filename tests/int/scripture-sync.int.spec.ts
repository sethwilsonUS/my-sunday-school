// @vitest-environment node

import { describe, expect, it } from 'vitest'

import {
  buildLexicalPassage,
  createScriptureManifest,
  parseEpiscopalLectionaryHtml,
  parseScriptureReference,
  parseWebChapterHtml,
  planScriptureSync,
  selectWebVerses,
  scriptureManifestDigest,
  validateScriptureManifest,
  webChapterUrl,
} from '../../scripts/scripture-sync-helpers'

const proper11Html = `
  <div class="wp-block-getwid-tabs">
    <div class="wp-block-getwid-tabs__nav-link"><span class="wp-block-getwid-tabs__title">Track 1</span></div>
    <div class="wp-block-getwid-tabs__tab-content-wrapper">
      <div class="wp-block-getwid-tabs__tab-content">
        <p><strong>Old Testament:</strong> Genesis 28:10-19a</p>
        <p><strong>Psalm:</strong> Psalm 139:1-11, 22-23 or Wisdom of Solomon 12:13,16-19</p>
      </div>
    </div>
    <div class="wp-block-getwid-tabs__nav-link"><span class="wp-block-getwid-tabs__title">Track 2</span></div>
    <div class="wp-block-getwid-tabs__tab-content-wrapper">
      <div class="wp-block-getwid-tabs__tab-content">
        <p><strong>Old Testament:</strong> Isaiah 44:6-8</p>
        <p><strong>Psalm:</strong> Psalm 86:11-17</p>
      </div>
    </div>
  </div>
  <p><strong>Epistle:</strong> Romans 8:12-25</p>
  <p><strong>Gospel:</strong> Matthew 13:24-30, 36-43</p>
`

describe('Episcopal lectionary reference parsing', () => {
  it('keeps both tracks, every printed alternative, and shared readings in lectionary order', () => {
    expect(parseEpiscopalLectionaryHtml(proper11Html)).toEqual([
      { reference: 'Genesis 28:10-19a', track: 'track-1' },
      { reference: 'Psalm 139:1-11, 22-23', track: 'track-1' },
      { reference: 'Wisdom of Solomon 12:13,16-19', track: 'track-1' },
      { reference: 'Isaiah 44:6-8', track: 'track-2' },
      { reference: 'Psalm 86:11-17', track: 'track-2' },
      { reference: 'Romans 8:12-25', track: 'none' },
      { reference: 'Matthew 13:24-30, 36-43', track: 'none' },
    ])
  })

  it('parses noncontiguous and cross-chapter references', () => {
    expect(parseScriptureReference('Matthew 13:24-30, 36-43')).toMatchObject({
      bookCode: 'MAT',
      selections: [
        { chapter: 13, startVerse: 24, endVerse: 30 },
        { chapter: 13, startVerse: 36, endVerse: 43 },
      ],
    })

    expect(parseScriptureReference('Genesis 1:31-2:4a')).toMatchObject({
      bookCode: 'GEN',
      selections: [
        { chapter: 1, startVerse: 31 },
        { chapter: 2, startVerse: 1, endVerse: 4, endPart: 'a' },
      ],
    })
  })

  it('blocks unsupported nonbiblical canticles instead of silently dropping them', () => {
    expect(() => parseScriptureReference('Canticle 9')).toThrow(
      /Unsupported scripture book or canticle/,
    )
  })

  it('uses the official zero-padded WEB Psalm chapter URLs', () => {
    expect(webChapterUrl('PSA', 86)).toBe('https://ebible.org/eng-web/PSA086.htm')
    expect(webChapterUrl('MAT', 13)).toBe('https://ebible.org/eng-web/MAT13.htm')
    expect(webChapterUrl('ROM', 8)).toBe('https://ebible.org/eng-web/ROM08.htm')
    expect(webChapterUrl('RUT', 1)).toBe('https://ebible.org/eng-web/RUT1.htm')
  })
})

describe('official WEB chapter parsing', () => {
  it('removes footnotes and applies the curated Proper 11A half-verse boundary', () => {
    const chapter = parseWebChapterHtml(`
      <div class="p"><span class="verse" id="V18">18&nbsp;</span>Jacob rose early.</div>
      <div class="p"><span class="verse" id="V19">19&nbsp;</span>He called the name of that place Bethel, but the name of the city was Luz at the first.<a class="notemark" href="#FN1">*<span class="popup">A note</span></a></div>
      <div class="p"><span class="verse" id="V20">20&nbsp;</span>Jacob vowed a vow.</div>
    `)
    const parsed = parseScriptureReference('Genesis 28:18-19a')
    const selected = selectWebVerses('Genesis 28:18-19a', parsed, new Map([[28, chapter]]))

    expect(selected).toEqual([
      { number: 18, lines: [{ kind: 'prose', text: 'Jacob rose early.' }] },
      {
        number: 19,
        lines: [{ kind: 'prose', text: 'He called the name of that place Bethel,' }],
      },
    ])
  })

  it('selects a standalone b half-verse in a noncontiguous Psalm appointment', () => {
    const chapter = parseWebChapterHtml(`
      <div class="q"><span class="verse" id="V1">1&nbsp;</span>Verse one.</div>
      <div class="q"><span class="verse" id="V2">2&nbsp;</span>Verse two.</div>
      <div class="q"><span class="verse" id="V3">3&nbsp;</span>Verse three.</div>
      <div class="q"><span class="verse" id="V4">4&nbsp;</span>Verse four.</div>
      <div class="q"><span class="verse" id="V5">5&nbsp;</span>Verse five.</div>
      <div class="q"><span class="verse" id="V6">6&nbsp;</span>Verse six.</div>
      <div class="q"><span class="verse" id="V7">7&nbsp;</span>Verse seven.</div>
      <div class="q"><span class="verse" id="V8">8&nbsp;</span>Verse eight.</div>
      <div class="q"><span class="verse" id="V9">9&nbsp;</span>Verse nine.</div>
      <div class="q"><span class="verse" id="V10">10&nbsp;</span>Verse ten.</div>
      <div class="q"><span class="verse" id="V11">11&nbsp;</span>Verse eleven.</div>
      <div class="q"><span class="verse" id="V45">45&nbsp;</span>that they might keep his statutes,</div>
      <div class="q2">and observe his laws.</div>
      <div class="q">Praise Yah!</div>
    `)
    const reference = 'Psalm 105:1-11, 45b'
    const selected = selectWebVerses(
      reference,
      parseScriptureReference(reference),
      new Map([[105, chapter]]),
    )

    expect(selected).toHaveLength(12)
    expect(selected.at(-1)).toEqual({
      number: 45,
      lines: [{ kind: 'prose', text: 'Praise Yah!' }],
    })
  })

  it('preserves poetry continuation and indentation as semantic line breaks', () => {
    const verses = parseWebChapterHtml(`
      <div class="q"><span class="verse" id="V1">1&nbsp;</span>Yahweh, you have searched me,</div>
      <div class="q2">and you know me.</div>
      <div class="q"><span class="verse" id="V2">2&nbsp;</span>You know my sitting down.</div>
    `)
    const lexical = buildLexicalPassage(verses)
    const firstVerse = lexical.root.children[0]?.children

    expect(firstVerse?.[0]).toMatchObject({ format: 64, text: '1', type: 'text' })
    expect(firstVerse).toContainEqual({ type: 'linebreak', version: 1 })
    expect(firstVerse?.at(-1)).toMatchObject({ text: '\u2003and you know me.' })
  })
})

describe('scripture manifest and replacement safety', () => {
  const manifest = createScriptureManifest({
    generatedAt: '2026-07-15T12:00:00.000Z',
    passages: [
      {
        passageText: buildLexicalPassage([
          { number: 1, lines: [{ kind: 'prose', text: 'In the beginning.' }] },
        ]),
        reference: 'Genesis 1:1',
        track: 'track-1',
        translation: 'WEB',
        verseCount: 1,
      },
    ],
    sourceLectionaryUrl: 'https://episcopalchurch.org/lectionary/example-a',
  })

  it('detects manifest changes after dry-run approval', () => {
    expect(validateScriptureManifest(manifest)).toEqual(manifest)
    expect(scriptureManifestDigest(manifest)).toBe(manifest.sha256)
    expect(() =>
      validateScriptureManifest({
        ...manifest,
        passages: [{ ...manifest.passages[0], reference: 'Genesis 1:2' }],
      }),
    ).toThrow(/digest does not match/)
  })

  it('preserves generated row ids and updates WEB text idempotently', () => {
    const existing = [
      {
        id: 'row-1',
        passageText: { old: true },
        reference: 'Genesis 1:1',
        track: 'track-1' as const,
        translation: 'WEB',
      },
    ]
    const plan = planScriptureSync(existing, manifest, false)

    expect(plan.action).toBe('update')
    expect(plan.rows[0]?.id).toBe('row-1')
    expect(planScriptureSync(plan.rows, manifest, false).action).toBe('unchanged')
    expect(
      planScriptureSync(reverseObjectKeys(plan.rows) as typeof plan.rows, manifest, false).action,
    ).toBe('unchanged')
  })

  it('refuses to replace manual or non-WEB passages without an explicit override', () => {
    const existing = [
      {
        reference: 'Genesis 1:1',
        track: 'track-1' as const,
        translation: 'NRSV-UE',
      },
    ]

    expect(() => planScriptureSync(existing, manifest, false)).toThrow(
      /refusing to replace it without --replace-existing-scriptures/i,
    )
    expect(planScriptureSync(existing, manifest, true).action).toBe('update')
  })
})

function reverseObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(reverseObjectKeys)
  }

  if (!value || typeof value !== 'object') {
    return value
  }

  return Object.fromEntries(
    Object.entries(value)
      .reverse()
      .map(([key, entry]) => [key, reverseObjectKeys(entry)]),
  )
}
