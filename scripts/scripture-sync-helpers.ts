import crypto from 'node:crypto'

import { load, type Cheerio, type CheerioAPI } from 'cheerio'

type CheerioNode = ReturnType<CheerioAPI> extends Cheerio<infer Node> ? Node : never

export type ScriptureTrack = 'none' | 'track-1' | 'track-2'

export type EpiscopalReading = {
  reference: string
  track: ScriptureTrack
}

export type ScriptureLexicalState = {
  root: {
    children: Array<{
      children: Array<Record<string, unknown>>
      direction: null
      format: ''
      indent: number
      type: 'paragraph'
      version: 1
    }>
    direction: null
    format: ''
    indent: 0
    type: 'root'
    version: 1
  }
}

export type ScriptureManifestPassage = EpiscopalReading & {
  passageText: ScriptureLexicalState
  translation: 'WEB'
  verseCount: number
}

export type ScriptureManifest = {
  generatedAt: string
  lectionaryModified?: string
  passages: ScriptureManifestPassage[]
  schemaVersion: 1
  sha256: string
  sourceLectionaryUrl: string
}

export type ScriptureRow = {
  id?: string | null
  passageText?: unknown
  reference?: string | null
  track?: ScriptureTrack | null
  translation?: string | null
}

export type ScriptureSyncPlan = {
  action: 'add' | 'unchanged' | 'update'
  rows: ScriptureRow[]
}

type BookDefinition = {
  aliases: string[]
  code: string
  singleChapter?: boolean
}

type VerseSelection = {
  chapter: number
  endPart?: 'a' | 'b'
  endVerse: number
  startPart?: 'a' | 'b'
  startVerse: number
}

export type ParsedScriptureReference = {
  bookCode: string
  selections: VerseSelection[]
}

type WebVerseLine = {
  kind: 'poetry' | 'poetry-indent' | 'prose'
  text: string
}

export type WebVerse = {
  lines: WebVerseLine[]
  number: number
}

const bookDefinitions: BookDefinition[] = [
  { aliases: ['Genesis'], code: 'GEN' },
  { aliases: ['Exodus'], code: 'EXO' },
  { aliases: ['Leviticus'], code: 'LEV' },
  { aliases: ['Numbers'], code: 'NUM' },
  { aliases: ['Deuteronomy'], code: 'DEU' },
  { aliases: ['Joshua'], code: 'JOS' },
  { aliases: ['Judges'], code: 'JDG' },
  { aliases: ['Ruth'], code: 'RUT' },
  { aliases: ['1 Samuel', 'I Samuel'], code: '1SA' },
  { aliases: ['2 Samuel', 'II Samuel'], code: '2SA' },
  { aliases: ['1 Kings', 'I Kings'], code: '1KI' },
  { aliases: ['2 Kings', 'II Kings'], code: '2KI' },
  { aliases: ['1 Chronicles', 'I Chronicles'], code: '1CH' },
  { aliases: ['2 Chronicles', 'II Chronicles'], code: '2CH' },
  { aliases: ['Ezra'], code: 'EZR' },
  { aliases: ['Nehemiah'], code: 'NEH' },
  { aliases: ['Esther'], code: 'EST' },
  { aliases: ['Job'], code: 'JOB' },
  { aliases: ['Psalms', 'Psalm'], code: 'PSA' },
  { aliases: ['Proverbs'], code: 'PRO' },
  { aliases: ['Ecclesiastes'], code: 'ECC' },
  { aliases: ['Song of Solomon', 'Song of Songs'], code: 'SNG' },
  { aliases: ['Isaiah'], code: 'ISA' },
  { aliases: ['Jeremiah'], code: 'JER' },
  { aliases: ['Lamentations'], code: 'LAM' },
  { aliases: ['Ezekiel'], code: 'EZK' },
  { aliases: ['Daniel'], code: 'DAN' },
  { aliases: ['Hosea'], code: 'HOS' },
  { aliases: ['Joel'], code: 'JOL' },
  { aliases: ['Amos'], code: 'AMO' },
  { aliases: ['Obadiah'], code: 'OBA', singleChapter: true },
  { aliases: ['Jonah'], code: 'JON' },
  { aliases: ['Micah'], code: 'MIC' },
  { aliases: ['Nahum'], code: 'NAM' },
  { aliases: ['Habakkuk'], code: 'HAB' },
  { aliases: ['Zephaniah'], code: 'ZEP' },
  { aliases: ['Haggai'], code: 'HAG' },
  { aliases: ['Zechariah'], code: 'ZEC' },
  { aliases: ['Malachi'], code: 'MAL' },
  { aliases: ['Matthew'], code: 'MAT' },
  { aliases: ['Mark'], code: 'MRK' },
  { aliases: ['Luke'], code: 'LUK' },
  { aliases: ['John'], code: 'JHN' },
  { aliases: ['Acts of the Apostles', 'Acts'], code: 'ACT' },
  { aliases: ['Romans'], code: 'ROM' },
  { aliases: ['1 Corinthians', 'I Corinthians'], code: '1CO' },
  { aliases: ['2 Corinthians', 'II Corinthians'], code: '2CO' },
  { aliases: ['Galatians'], code: 'GAL' },
  { aliases: ['Ephesians'], code: 'EPH' },
  { aliases: ['Philippians'], code: 'PHP' },
  { aliases: ['Colossians'], code: 'COL' },
  { aliases: ['1 Thessalonians', 'I Thessalonians'], code: '1TH' },
  { aliases: ['2 Thessalonians', 'II Thessalonians'], code: '2TH' },
  { aliases: ['1 Timothy', 'I Timothy'], code: '1TI' },
  { aliases: ['2 Timothy', 'II Timothy'], code: '2TI' },
  { aliases: ['Titus'], code: 'TIT' },
  { aliases: ['Philemon'], code: 'PHM', singleChapter: true },
  { aliases: ['Hebrews'], code: 'HEB' },
  { aliases: ['James'], code: 'JAS' },
  { aliases: ['1 Peter', 'I Peter'], code: '1PE' },
  { aliases: ['2 Peter', 'II Peter'], code: '2PE' },
  { aliases: ['1 John', 'I John'], code: '1JN' },
  { aliases: ['2 John', 'II John'], code: '2JN', singleChapter: true },
  { aliases: ['3 John', 'III John'], code: '3JN', singleChapter: true },
  { aliases: ['Jude'], code: 'JUD', singleChapter: true },
  { aliases: ['Revelation to John', 'Revelation'], code: 'REV' },
  { aliases: ['Tobit'], code: 'TOB' },
  { aliases: ['Judith'], code: 'JDT' },
  { aliases: ['Wisdom of Solomon', 'Wisdom'], code: 'WIS' },
  { aliases: ['Ecclesiasticus', 'Sirach'], code: 'SIR' },
  { aliases: ['Baruch'], code: 'BAR' },
  { aliases: ['Letter of Jeremiah'], code: 'LJE', singleChapter: true },
  { aliases: ['Prayer of Azariah'], code: 'S3Y', singleChapter: true },
  { aliases: ['Susanna'], code: 'SUS', singleChapter: true },
  { aliases: ['Bel and the Dragon'], code: 'BEL', singleChapter: true },
  { aliases: ['1 Maccabees', 'I Maccabees'], code: '1MA' },
  { aliases: ['2 Maccabees', 'II Maccabees'], code: '2MA' },
  { aliases: ['1 Esdras', 'I Esdras'], code: '1ES' },
  { aliases: ['2 Esdras', 'II Esdras'], code: '2ES' },
  { aliases: ['Prayer of Manasseh'], code: 'MAN', singleChapter: true },
]

const sortedBookAliases = bookDefinitions
  .flatMap((book) => book.aliases.map((alias) => ({ alias, book })))
  .sort((left, right) => right.alias.length - left.alias.length)

const readingLabelPattern =
  /^(?:old testament|first reading|psalm|canticle|epistle|second reading|gospel)\s*:/i

const multiDigitChapterBooks = new Set([
  'GEN',
  'EXO',
  'LEV',
  'NUM',
  'DEU',
  'JOS',
  'JDG',
  '1SA',
  '2SA',
  '1KI',
  '2KI',
  '1CH',
  '2CH',
  'EZR',
  'NEH',
  'EST',
  'JOB',
  'PRO',
  'ECC',
  'ISA',
  'JER',
  'EZK',
  'DAN',
  'HOS',
  'ZEC',
  'MAT',
  'MRK',
  'LUK',
  'JHN',
  'ACT',
  'ROM',
  '1CO',
  '2CO',
  'HEB',
  'REV',
  'TOB',
  'JDT',
  'WIS',
  'SIR',
  '1MA',
  '2MA',
  '2ES',
])

const partialVerseBoundaries: Record<string, { marker: string; side: 'end' | 'start' }> = {
  'GEN.28.19.a.end': { marker: 'Bethel,', side: 'end' },
  'PSA.105.45.b.start': { marker: 'Praise Yah!', side: 'start' },
}

export function parseEpiscopalLectionaryHtml(html: string): EpiscopalReading[] {
  const $ = load(html)
  const readings: EpiscopalReading[] = []
  const tabs = $('.wp-block-getwid-tabs').first()

  if (tabs.length > 0) {
    const labels = tabs
      .find('.wp-block-getwid-tabs__title')
      .toArray()
      .map((element) => normalizeText($(element).text()))

    tabs.find('.wp-block-getwid-tabs__tab-content').each((index, element) => {
      const label = labels[index]
      const track = trackFromLabel(label)

      if (!track) {
        throw new Error(`Unsupported Episcopal lectionary track label: ${label || '(missing)'}`)
      }

      readings.push(...readingHeadingsFrom($, $(element).find('p').toArray(), track))
    })

    readings.push(...readingHeadingsFrom($, tabs.nextAll('p').toArray(), 'none'))
  } else {
    readings.push(...readingHeadingsFrom($, $('p').toArray(), 'none'))
  }

  if (readings.length === 0) {
    throw new Error(
      'No appointed scripture references were found on the Episcopal lectionary page.',
    )
  }

  return readings
}

function readingHeadingsFrom($: CheerioAPI, elements: CheerioNode[], track: ScriptureTrack) {
  const readings: EpiscopalReading[] = []

  for (const element of elements) {
    const paragraph = $(element)
    const strongText = normalizeText(paragraph.find('strong').first().text())

    if (!readingLabelPattern.test(strongText)) {
      continue
    }

    const text = normalizeText(paragraph.text())
    const references = text
      .replace(readingLabelPattern, '')
      .trim()
      .split(/\s+or\s+/i)

    for (const reference of references) {
      const cleaned = normalizeReference(reference)

      if (cleaned) {
        readings.push({ reference: cleaned, track })
      }
    }
  }

  return readings
}

function trackFromLabel(label: string): Exclude<ScriptureTrack, 'none'> | null {
  if (/\btrack\s*1\b/i.test(label)) {
    return 'track-1'
  }

  if (/\btrack\s*2\b/i.test(label)) {
    return 'track-2'
  }

  return null
}

export function parseScriptureReference(reference: string): ParsedScriptureReference {
  const normalized = normalizeReference(reference).replace(/[()]/g, '')
  const alias = sortedBookAliases.find(({ alias: candidate }) =>
    normalized.toLowerCase().startsWith(`${candidate.toLowerCase()} `),
  )

  if (!alias) {
    throw new Error(`Unsupported scripture book or canticle in reference: ${reference}`)
  }

  const locator = normalized.slice(alias.alias.length).trim()

  if (!locator) {
    throw new Error(`Scripture reference is missing a chapter or verse locator: ${reference}`)
  }

  if (!locator.includes(':')) {
    if (alias.book.singleChapter && /^\d+[ab]?(?:-\d+[ab]?)?$/.test(locator)) {
      return {
        bookCode: alias.book.code,
        selections: parseSelectionToken(1, locator, reference),
      }
    }

    if (!/^\d+$/.test(locator)) {
      throw new Error(`Unsupported scripture locator: ${reference}`)
    }

    return {
      bookCode: alias.book.code,
      selections: [
        {
          chapter: Number(locator),
          endVerse: Number.MAX_SAFE_INTEGER,
          startVerse: 1,
        },
      ],
    }
  }

  const selections: VerseSelection[] = []
  let currentChapter: number | undefined

  for (const token of locator.split(/\s*[,;]\s*/)) {
    const chapterMatch = token.match(/^(\d+):(.*)$/)
    const selectionText = chapterMatch?.[2] ?? token

    if (chapterMatch) {
      currentChapter = Number(chapterMatch[1])
    }

    if (!currentChapter || !selectionText) {
      throw new Error(`Unsupported scripture locator: ${reference}`)
    }

    const parsed = parseSelectionToken(currentChapter, selectionText, reference)
    selections.push(...parsed)
    currentChapter = parsed.at(-1)?.chapter ?? currentChapter
  }

  return { bookCode: alias.book.code, selections }
}

function parseSelectionToken(chapter: number, token: string, reference: string): VerseSelection[] {
  const match = token.match(/^(\d+)([ab])?(?:-(?:(\d+):)?(\d+)([ab])?)?$/i)

  if (!match) {
    throw new Error(`Unsupported scripture verse range in ${reference}: ${token}`)
  }

  const startVerse = Number(match[1])
  const startPart = match[2]?.toLowerCase() as 'a' | 'b' | undefined

  if (!match[4]) {
    const partialBoundary =
      startPart === 'a' ? { endPart: startPart } : startPart === 'b' ? { startPart } : {}

    return [
      {
        chapter,
        ...partialBoundary,
        endVerse: startVerse,
        startVerse,
      },
    ]
  }

  const endChapter = match[3] ? Number(match[3]) : chapter
  const endVerse = Number(match[4])
  const endPart = match[5]?.toLowerCase() as 'a' | 'b' | undefined

  if (endChapter < chapter) {
    throw new Error(`Scripture range ends before it starts: ${reference}`)
  }

  if (endChapter === chapter) {
    if (endVerse < startVerse) {
      throw new Error(`Scripture range ends before it starts: ${reference}`)
    }

    return [{ chapter, endPart, endVerse, startPart, startVerse }]
  }

  const selections: VerseSelection[] = [
    {
      chapter,
      endVerse: Number.MAX_SAFE_INTEGER,
      startPart,
      startVerse,
    },
  ]

  for (
    let intermediateChapter = chapter + 1;
    intermediateChapter < endChapter;
    intermediateChapter += 1
  ) {
    selections.push({
      chapter: intermediateChapter,
      endVerse: Number.MAX_SAFE_INTEGER,
      startVerse: 1,
    })
  }

  selections.push({ chapter: endChapter, endPart, endVerse, startVerse: 1 })
  return selections
}

export function webChapterUrl(bookCode: string, chapter: number) {
  const width = bookCode === 'PSA' ? 3 : multiDigitChapterBooks.has(bookCode) ? 2 : 1
  const chapterLocator = String(chapter).padStart(width, '0')
  return `https://ebible.org/eng-web/${bookCode}${chapterLocator}.htm`
}

export function parseWebChapterHtml(html: string): WebVerse[] {
  const $ = load(html)
  const verses = new Map<number, WebVerse>()
  let currentVerse: number | undefined
  const blockSelector = [
    'div.p',
    'div.m',
    'div.pi',
    'div.pi1',
    'div.pi2',
    'div.pc',
    'div.q',
    'div.q1',
    'div.q2',
    'div.q3',
    'div.q4',
    'div.li',
    'div.li1',
    'div.li2',
  ].join(', ')

  $(blockSelector).each((_index, element) => {
    const block = $(element).clone()
    block.find('.notemark, .popup, .footnote').remove()
    const className = block.attr('class') ?? ''
    const kind: WebVerseLine['kind'] = /\b(?:q2|q3|q4|pi2|li2)\b/.test(className)
      ? 'poetry-indent'
      : /\b(?:q|q1|pi|pi1|li|li1)\b/.test(className)
        ? 'poetry'
        : 'prose'
    let buffer = ''

    const flush = () => {
      const text = normalizeText(buffer)
      buffer = ''

      if (!currentVerse || !text) {
        return
      }

      const verse = verses.get(currentVerse) ?? { lines: [], number: currentVerse }
      verse.lines.push({ kind, text })
      verses.set(currentVerse, verse)
    }

    const visit = (node: HtmlNode) => {
      if (node.type === 'text') {
        buffer += node.data ?? ''
        return
      }

      const classes = node.attribs?.class ?? ''

      if (/\b(?:notemark|popup|footnote)\b/.test(classes)) {
        return
      }

      if (/\bverse\b/.test(classes) && /^V\d+$/.test(node.attribs?.id ?? '')) {
        flush()
        currentVerse = Number((node.attribs?.id ?? '').slice(1))
        return
      }

      if (node.name === 'br') {
        buffer += '\n'
        return
      }

      for (const child of node.children ?? []) {
        visit(child)
      }
    }

    for (const node of block.contents().toArray() as unknown as HtmlNode[]) {
      visit(node)
    }

    flush()
  })

  return [...verses.values()].sort((left, right) => left.number - right.number)
}

type HtmlNode = {
  attribs?: Record<string, string>
  children?: HtmlNode[]
  data?: string
  name?: string
  type: string
}

export function selectWebVerses(
  reference: string,
  parsed: ParsedScriptureReference,
  chapters: Map<number, WebVerse[]>,
) {
  const selected: WebVerse[] = []
  const seen = new Set<string>()

  for (const selection of parsed.selections) {
    const chapterVerses = chapters.get(selection.chapter)

    if (!chapterVerses) {
      throw new Error(`WEB chapter was not fetched for ${reference}: chapter ${selection.chapter}`)
    }

    const matching = chapterVerses.filter(
      (verse) => verse.number >= selection.startVerse && verse.number <= selection.endVerse,
    )

    if (matching.length === 0 || matching[0]?.number !== selection.startVerse) {
      throw new Error(`WEB did not contain the requested starting verse for ${reference}.`)
    }

    if (
      selection.endVerse !== Number.MAX_SAFE_INTEGER &&
      matching.at(-1)?.number !== selection.endVerse
    ) {
      throw new Error(`WEB did not contain the requested ending verse for ${reference}.`)
    }

    for (const verse of matching) {
      const key = `${selection.chapter}:${verse.number}`

      if (seen.has(key)) {
        continue
      }

      const startPart = verse.number === selection.startVerse ? selection.startPart : undefined
      const endPart = verse.number === selection.endVerse ? selection.endPart : undefined
      selected.push(
        applyPartialVerse(reference, parsed.bookCode, selection.chapter, verse, startPart, endPart),
      )
      seen.add(key)
    }
  }

  return selected
}

function applyPartialVerse(
  reference: string,
  bookCode: string,
  chapter: number,
  verse: WebVerse,
  startPart?: 'a' | 'b',
  endPart?: 'a' | 'b',
): WebVerse {
  let text = verse.lines.map((line) => line.text).join(' ')

  if (startPart) {
    const boundary =
      partialVerseBoundaries[`${bookCode}.${chapter}.${verse.number}.${startPart}.start`]

    if (!boundary || boundary.side !== 'start') {
      throw new Error(
        `No curated WEB boundary exists for the partial starting verse in ${reference}; refusing to guess.`,
      )
    }

    const markerIndex = text.indexOf(boundary.marker)

    if (markerIndex < 0) {
      throw new Error(`The curated partial-verse boundary no longer matches WEB for ${reference}.`)
    }

    text = text.slice(markerIndex)
  }

  if (endPart) {
    const boundary = partialVerseBoundaries[`${bookCode}.${chapter}.${verse.number}.${endPart}.end`]

    if (!boundary || boundary.side !== 'end') {
      throw new Error(
        `No curated WEB boundary exists for the partial ending verse in ${reference}; refusing to guess.`,
      )
    }

    const markerIndex = text.indexOf(boundary.marker)

    if (markerIndex < 0) {
      throw new Error(`The curated partial-verse boundary no longer matches WEB for ${reference}.`)
    }

    text = text.slice(0, markerIndex + boundary.marker.length)
  }

  if (!startPart && !endPart) {
    return verse
  }

  return { lines: [{ kind: 'prose', text }], number: verse.number }
}

export function buildLexicalPassage(verses: WebVerse[]): ScriptureLexicalState {
  return {
    root: {
      children: verses.map((verse) => ({
        children: [
          textNode(String(verse.number), 64),
          textNode(' '),
          ...verse.lines.flatMap((line, index) => {
            const prefix = line.kind === 'poetry-indent' ? '\u2003' : ''
            const nodes: Array<Record<string, unknown>> = []

            if (index > 0) {
              nodes.push({ type: 'linebreak', version: 1 })
            }

            nodes.push(textNode(`${prefix}${line.text}`))
            return nodes
          }),
        ],
        direction: null,
        format: '',
        indent: 0,
        type: 'paragraph',
        version: 1,
      })),
      direction: null,
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  }
}

function textNode(text: string, format = 0) {
  return {
    detail: 0,
    format,
    mode: 'normal',
    style: '',
    text,
    type: 'text',
    version: 1,
  }
}

export function createScriptureManifest(input: {
  generatedAt?: string
  lectionaryModified?: string
  passages: ScriptureManifestPassage[]
  sourceLectionaryUrl: string
}): ScriptureManifest {
  const core = {
    lectionaryModified: input.lectionaryModified,
    passages: input.passages,
    schemaVersion: 1 as const,
    sourceLectionaryUrl: input.sourceLectionaryUrl,
  }

  return {
    ...core,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    sha256: scriptureManifestDigest(core),
  }
}

export function scriptureManifestDigest(
  manifest: Pick<
    ScriptureManifest,
    'lectionaryModified' | 'passages' | 'schemaVersion' | 'sourceLectionaryUrl'
  >,
) {
  const canonicalContent = {
    lectionaryModified: manifest.lectionaryModified,
    passages: manifest.passages,
    schemaVersion: manifest.schemaVersion,
    sourceLectionaryUrl: manifest.sourceLectionaryUrl,
  }

  return crypto.createHash('sha256').update(JSON.stringify(canonicalContent)).digest('hex')
}

export function validateScriptureManifest(value: unknown): ScriptureManifest {
  if (!value || typeof value !== 'object') {
    throw new Error('Scripture manifest is not a JSON object.')
  }

  const manifest = value as Partial<ScriptureManifest>

  if (
    manifest.schemaVersion !== 1 ||
    typeof manifest.sourceLectionaryUrl !== 'string' ||
    typeof manifest.generatedAt !== 'string' ||
    typeof manifest.sha256 !== 'string' ||
    !Array.isArray(manifest.passages)
  ) {
    throw new Error('Scripture manifest is missing required fields or uses an unsupported version.')
  }

  const digest = scriptureManifestDigest({
    lectionaryModified: manifest.lectionaryModified,
    passages: manifest.passages,
    schemaVersion: manifest.schemaVersion,
    sourceLectionaryUrl: manifest.sourceLectionaryUrl,
  })

  if (digest !== manifest.sha256) {
    throw new Error('Scripture manifest digest does not match its contents. Run the dry run again.')
  }

  return manifest as ScriptureManifest
}

export function planScriptureSync(
  existingRows: ScriptureRow[] | null | undefined,
  manifest: ScriptureManifest,
  replaceExisting: boolean,
): ScriptureSyncPlan {
  const existing = existingRows ?? []

  if (
    existing.length > 0 &&
    !replaceExisting &&
    existing.some((row) => row.translation?.trim().toUpperCase() !== 'WEB')
  ) {
    throw new Error(
      'Existing scripture includes manual or non-WEB text. Refusing to replace it without --replace-existing-scriptures.',
    )
  }

  const existingByKey = new Map(existing.map((row) => [scriptureRowKey(row), row]))
  const rows: ScriptureRow[] = manifest.passages.map((passage) => {
    const row: ScriptureRow = {
      passageText: passage.passageText,
      reference: passage.reference,
      track: passage.track,
      translation: passage.translation,
    }
    const matched = existingByKey.get(scriptureRowKey(row))
    return matched?.id ? { ...row, id: matched.id } : row
  })
  const comparableExisting = existing.map(withoutScriptureRowId)
  const comparableRows = rows.map(withoutScriptureRowId)

  if (stableStringify(comparableExisting) === stableStringify(comparableRows)) {
    return { action: 'unchanged', rows }
  }

  return { action: existing.length > 0 ? 'update' : 'add', rows }
}

function scriptureRowKey(row: ScriptureRow) {
  return [row.track ?? 'none', row.reference?.trim() ?? '', row.translation?.trim() ?? ''].join('|')
}

function withoutScriptureRowId(row: ScriptureRow) {
  const { id: _id, ...rest } = row
  return rest
}

function stableStringify(value: unknown) {
  return JSON.stringify(sortObjectKeys(value))
}

function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeys)
  }

  if (!value || typeof value !== 'object') {
    return value
  }

  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, sortObjectKeys(entry)]),
  )
}

function normalizeReference(value: string) {
  return normalizeText(value).replace(/[–—]/g, '-').trim()
}

function normalizeText(value: string) {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
