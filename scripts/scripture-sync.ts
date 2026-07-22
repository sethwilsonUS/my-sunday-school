import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import {
  buildLexicalPassage,
  createScriptureManifest,
  parseEpiscopalLectionaryHtml,
  parseScriptureReference,
  parseWebChapterHtml,
  selectWebVerses,
  scriptureManifestDigest,
  validateScriptureManifest,
  webChapterUrl,
  type ScriptureManifest,
} from './scripture-sync-helpers'

type FetchLike = typeof fetch

type EpiscopalLectionaryPost = {
  content?: { rendered?: string }
  link?: string
  modified?: string
  slug?: string
}

export function episcopalLectionaryApiUrl(sourceUrl: string) {
  const url = new URL(sourceUrl)

  if (!['episcopalchurch.org', 'www.episcopalchurch.org'].includes(url.hostname.toLowerCase())) {
    throw new Error('Scripture sync requires an episcopalchurch.org lectionary URL.')
  }

  const parts = url.pathname.split('/').filter(Boolean)
  const lectionaryIndex = parts.findIndex((part) => part.toLowerCase() === 'lectionary')
  const slug = parts[lectionaryIndex + 1]?.toLowerCase()

  if (lectionaryIndex < 0 || !slug) {
    throw new Error('Scripture sync requires an Episcopal Church lectionary page URL with a slug.')
  }

  const apiUrl = new URL('https://www.episcopalchurch.org/wp-json/wp/v2/lectionary')
  apiUrl.searchParams.set('slug', slug)
  apiUrl.searchParams.set('_fields', 'id,slug,link,modified,content')
  return apiUrl.toString()
}

export async function buildScriptureManifestFromSources(
  sourceUrl: string,
  fetchImpl: FetchLike = fetch,
) {
  const apiUrl = episcopalLectionaryApiUrl(sourceUrl)
  const response = await fetchWithTimeout(fetchImpl, apiUrl)
  const posts = (await response.json()) as EpiscopalLectionaryPost[]
  const post = posts[0]

  if (!post?.content?.rendered) {
    throw new Error(`The Episcopal lectionary API returned no content for ${sourceUrl}.`)
  }

  const readings = parseEpiscopalLectionaryHtml(post.content.rendered)
  const chapterCache = new Map<string, ReturnType<typeof parseWebChapterHtml>>()
  const passages = []

  for (const reading of readings) {
    const parsed = parseScriptureReference(reading.reference)
    const chapters = new Map<number, ReturnType<typeof parseWebChapterHtml>>()

    for (const chapter of new Set(parsed.selections.map((selection) => selection.chapter))) {
      const url = webChapterUrl(parsed.bookCode, chapter)
      let verses = chapterCache.get(url)

      if (!verses) {
        const webResponse = await fetchWithTimeout(fetchImpl, url)
        verses = parseWebChapterHtml(await webResponse.text())

        if (verses.length === 0) {
          throw new Error(`No WEB verses were found at ${url}.`)
        }

        chapterCache.set(url, verses)
      }

      chapters.set(chapter, verses)
    }

    const verses = selectWebVerses(reading.reference, parsed, chapters)
    passages.push({
      ...reading,
      passageText: buildLexicalPassage(verses),
      translation: 'WEB' as const,
      verseCount: verses.length,
    })
  }

  return createScriptureManifest({
    lectionaryModified: post.modified,
    passages,
    sourceLectionaryUrl: normalizeSourceUrl(post.link ?? sourceUrl),
  })
}

async function fetchWithTimeout(fetchImpl: FetchLike, url: string) {
  const response = await fetchImpl(url, {
    headers: { 'User-Agent': 'my-sunday-school-scripture-sync/1.0' },
    signal: AbortSignal.timeout(20_000),
  })

  if (!response.ok) {
    throw new Error(`Scripture source returned HTTP ${response.status}: ${url}`)
  }

  return response
}

export async function writeScriptureManifest(filePath: string, manifest: ScriptureManifest) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
}

export async function readScriptureManifest(filePath: string) {
  const raw = await readFile(filePath, 'utf8')
  return validateScriptureManifest(JSON.parse(raw) as unknown)
}

export function validateScriptureManifestForWrite(
  manifest: ScriptureManifest,
  expectedSourceUrl: string,
  expectedSha?: string,
) {
  const normalizedExpected = normalizeSourceUrl(expectedSourceUrl)

  if (normalizeSourceUrl(manifest.sourceLectionaryUrl) !== normalizedExpected) {
    throw new Error(
      `Scripture manifest belongs to ${manifest.sourceLectionaryUrl}, not ${normalizedExpected}. Run the dry run again.`,
    )
  }

  const digest = scriptureManifestDigest(manifest)

  if (expectedSha && digest !== expectedSha) {
    throw new Error('Scripture manifest changed after approval. Run the guarded dry run again.')
  }
}

export function logScriptureManifest(manifest: ScriptureManifest) {
  console.log('Planned WEB scripture passages:')

  for (const passage of manifest.passages) {
    const track = passage.track === 'none' ? 'Shared' : passage.track === 'track-1' ? 'Track 1' : 'Track 2'
    console.log(
      `  [${track}] ${passage.reference} · ${passage.translation} · ${passage.verseCount} verse${passage.verseCount === 1 ? '' : 's'}`,
    )
  }

  console.log(`Scripture manifest SHA-256: ${manifest.sha256}`)
}

function normalizeSourceUrl(value: string) {
  const url = new URL(value)
  url.hash = ''
  url.search = ''
  url.hostname = url.hostname.replace(/^www\./, '').toLowerCase()
  url.pathname = url.pathname.replace(/\/+$/, '').toLowerCase()
  return url.toString()
}
