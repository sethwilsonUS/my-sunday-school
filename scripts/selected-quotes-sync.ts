import crypto from 'node:crypto'
import { readFile } from 'node:fs/promises'

import type { Lesson } from '../src/payload-types'

export type SelectedPayloadQuote = {
  author?: string
  id: string
  source?: string
  text: string
  year?: string
}

export type SelectedQuoteManifest = {
  generatedAt: string
  lessonKey: string
  quotes: SelectedPayloadQuote[]
  schemaVersion: 1
  sha256: string
}

export type SelectedQuoteSyncPlan = {
  added: number
  enriched: number
  rows: NonNullable<Lesson['quotes']>
}

export async function readSelectedQuoteManifest(filePath: string) {
  const raw = await readFile(filePath, 'utf8')
  return validateSelectedQuoteManifest(JSON.parse(raw) as unknown)
}

export function validateSelectedQuoteManifest(value: unknown): SelectedQuoteManifest {
  if (!isRecord(value) || value.schemaVersion !== 1) {
    throw new Error('Selected quote manifest must use schemaVersion 1.')
  }

  if (
    typeof value.generatedAt !== 'string' ||
    typeof value.lessonKey !== 'string' ||
    typeof value.sha256 !== 'string' ||
    !Array.isArray(value.quotes)
  ) {
    throw new Error('Selected quote manifest is missing required fields.')
  }

  const quotes = value.quotes.map((quote, index) => validateQuote(quote, index))
  const ids = new Set(quotes.map((quote) => quote.id))

  if (ids.size !== quotes.length) {
    throw new Error('Selected quote manifest contains duplicate quote ids.')
  }

  const manifest = {
    generatedAt: value.generatedAt,
    lessonKey: value.lessonKey,
    quotes,
    schemaVersion: 1 as const,
    sha256: value.sha256.toLowerCase(),
  }

  if (selectedQuoteManifestDigest(manifest) !== manifest.sha256) {
    throw new Error('Selected quote manifest digest does not match its contents.')
  }

  return manifest
}

export function validateSelectedQuoteManifestForWrite(
  manifest: SelectedQuoteManifest,
  expectedSha?: string,
) {
  if (!expectedSha) {
    throw new Error('Selected quote write requires --expect-quotes-sha from the approved dry run.')
  }

  if (selectedQuoteManifestDigest(manifest) !== expectedSha.toLowerCase()) {
    throw new Error('Selected quote manifest changed after approval. Run the guarded dry run again.')
  }
}

export function selectedQuoteManifestDigest(
  manifest: Omit<SelectedQuoteManifest, 'sha256'> | SelectedQuoteManifest,
) {
  return crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        lessonKey: manifest.lessonKey,
        quotes: manifest.quotes,
        schemaVersion: manifest.schemaVersion,
      }),
    )
    .digest('hex')
}

export function planSelectedQuoteSync(
  existing: Lesson['quotes'] | null | undefined,
  manifest: SelectedQuoteManifest,
): SelectedQuoteSyncPlan {
  const rows: NonNullable<Lesson['quotes']> = (existing ?? []).map((row) => ({ ...row }))
  let added = 0
  let enriched = 0

  for (const selected of manifest.quotes) {
    const match = rows.find((row) => quoteTextKey(row.text) === quoteTextKey(selected.text))

    if (!match) {
      rows.push(quoteRow(selected))
      added += 1
      continue
    }

    let changed = false

    for (const field of ['author', 'source', 'year'] as const) {
      if (!cleanOptionalText(match[field]) && selected[field]) {
        match[field] = selected[field]
        changed = true
      }
    }

    if (changed) {
      enriched += 1
    }
  }

  return { added, enriched, rows }
}

export function logSelectedQuoteManifest(manifest: SelectedQuoteManifest) {
  console.log(
    `Selected Payload quotes: ${manifest.quotes.length} quote${manifest.quotes.length === 1 ? '' : 's'}.`,
  )
  console.log(`Quote manifest SHA-256: ${manifest.sha256}`)
}

function validateQuote(value: unknown, index: number): SelectedPayloadQuote {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.text !== 'string') {
    throw new Error(`Selected quote manifest entry ${index + 1} needs id and text.`)
  }

  const id = value.id.trim()
  const text = value.text.trim()

  if (!id || !text) {
    throw new Error(`Selected quote manifest entry ${index + 1} needs non-empty id and text.`)
  }

  return withoutEmptyValues({
    author: optionalString(value.author, index, 'author'),
    id,
    source: optionalString(value.source, index, 'source'),
    text,
    year: optionalString(value.year, index, 'year'),
  })
}

function optionalString(value: unknown, index: number, field: string) {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  if (typeof value !== 'string') {
    throw new Error(`Selected quote manifest entry ${index + 1} has a non-text ${field}.`)
  }

  return value.trim() || undefined
}

function quoteRow(quote: SelectedPayloadQuote): NonNullable<Lesson['quotes']>[number] {
  return withoutEmptyValues({
    author: quote.author,
    source: quote.source,
    text: quote.text,
    year: quote.year,
  })
}

function quoteTextKey(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLocaleLowerCase('en-US')
}

function cleanOptionalText(value: string | null | undefined) {
  return value?.trim() || undefined
}

function withoutEmptyValues<T extends Record<string, string | undefined>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => Boolean(entry[1]?.trim())),
  ) as T
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
