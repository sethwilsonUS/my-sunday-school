import path from 'node:path'

import { candidateIsMateriallyBetter, extensionFromMimeType, type ImageDimensions } from './art-source-resolver'

export type RefreshArtOptions = {
  confirmSharedDB: boolean
  help: boolean
  ids: number[]
  limit?: number
  published: boolean
  slug?: string
  startAfter?: number
  write: boolean
}

export type RefreshMediaSummary = {
  artist?: string | null
  filename?: string | null
  height?: number | null
  id: number | string
  sourceUrl?: string | null
  title?: string | null
  width?: number | null
  workDate?: string | null
}

export type ResolvedRefreshCandidateSummary = {
  dimensions: ImageDimensions
  url: string
}

export const refreshArtUsage = `Usage:
  pnpm lesson:refresh-art -- --slug 2026-05-24-day-of-pentecost-a
  pnpm lesson:refresh-art -- --published
  pnpm lesson:refresh-art -- --ids 122,123,126
  pnpm lesson:refresh-art -- --write --confirm-shared-db --slug 2026-05-24-day-of-pentecost-a
  pnpm lesson:refresh-art -- --write --confirm-shared-db --published --limit 5

Default mode is dry run. Write mode requires --write --confirm-shared-db and a bounded scope.
`

export function parseRefreshArtArgs(args: string[]): RefreshArtOptions {
  const options: RefreshArtOptions = {
    confirmSharedDB: false,
    help: false,
    ids: [],
    published: false,
    write: false,
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]

    if (arg === '--') {
      continue
    }

    const inlineValueSeparatorIndex = arg.indexOf('=')
    const hasInlineValue = inlineValueSeparatorIndex !== -1
    const flag = hasInlineValue ? arg.slice(0, inlineValueSeparatorIndex) : arg
    const inlineValue = hasInlineValue ? arg.slice(inlineValueSeparatorIndex + 1) : undefined
    const readValue = () => {
      const value = inlineValue ?? args[index + 1]

      if (!value || value.startsWith('--')) {
        throw new Error(`${flag} requires a value.`)
      }

      if (!inlineValue) {
        index += 1
      }

      return value
    }

    switch (flag) {
      case '--confirm-shared-db':
        assertNoInlineValue(flag, hasInlineValue)
        options.confirmSharedDB = true
        break
      case '--help':
      case '-h':
        assertNoInlineValue(flag, hasInlineValue)
        options.help = true
        break
      case '--ids':
        options.ids = readValue()
          .split(',')
          .map((id) => id.trim())
          .map((id) => parsePositiveInteger(id, '--ids'))
        break
      case '--limit':
        options.limit = parsePositiveInteger(readValue(), '--limit')
        break
      case '--published':
        assertNoInlineValue(flag, hasInlineValue)
        options.published = true
        break
      case '--slug':
        options.slug = readValue().trim()
        break
      case '--start-after':
        options.startAfter = parsePositiveInteger(readValue(), '--start-after')
        break
      case '--write':
        assertNoInlineValue(flag, hasInlineValue)
        options.write = true
        break
      default:
        throw new Error(`Unknown option: ${arg}`)
    }
  }

  if (options.write && !options.confirmSharedDB) {
    throw new Error('Write mode requires --confirm-shared-db.')
  }

  if (options.write && !options.slug && options.ids.length === 0 && !options.limit) {
    throw new Error('Write mode requires --slug, --ids, or --limit for a bounded scope.')
  }

  return options
}

export function getRefreshAction(media: RefreshMediaSummary, candidate: ResolvedRefreshCandidateSummary) {
  const current =
    media.width && media.height
      ? {
          height: media.height,
          width: media.width,
        }
      : undefined

  if (!candidateIsMateriallyBetter(current, candidate.dimensions)) {
    return { action: 'skip' as const, reason: 'candidate is not materially better' }
  }

  return { action: 'refresh' as const, reason: 'candidate is materially better' }
}

export function refreshFilenameForMedia(media: Pick<RefreshMediaSummary, 'filename'>, mimeType: string) {
  const current = media.filename?.trim()
  const nextExtension = extensionFromMimeType(mimeType)

  if (!current) {
    return `artwork.${nextExtension}`
  }

  const currentExtension = path.extname(current).replace(/^\./, '').toLowerCase()

  if (currentExtension === nextExtension) {
    return current
  }

  const basename = current.slice(0, current.length - path.extname(current).length)

  return `${basename}.${nextExtension}`
}

function parsePositiveInteger(value: string, flag: string) {
  if (!/^[1-9]\d*$/.test(value)) {
    throw new Error(`${flag} must be a positive integer.`)
  }

  const parsed = Number(value)

  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`${flag} must be a positive integer.`)
  }

  return parsed
}

function assertNoInlineValue(flag: string, hasInlineValue: boolean) {
  if (hasInlineValue) {
    throw new Error(`${flag} does not accept a value.`)
  }
}
