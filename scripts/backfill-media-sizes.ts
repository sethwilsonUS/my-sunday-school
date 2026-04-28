import { put } from '@vercel/blob'
import dotenv from 'dotenv'
import { getPayload } from 'payload'
import sharp from 'sharp'

import type { Media } from '../src/payload-types'

dotenv.config({ path: '.env.local' })
dotenv.config()

const { default: config } = await import('../src/payload.config.js')

type MediaSizeName = 'thumbnail' | 'card' | 'large'

type MediaSizeSpec = {
  name: MediaSizeName
  width: number
}

type BackfillOptions = {
  confirmSharedDB: boolean
  help: boolean
  ids: number[]
  limit?: number
  startAfter?: number
  write: boolean
}

type ExpectedSize = {
  filename: string
  height: number
  width: number
}

type MediaSizeData = NonNullable<NonNullable<Media['sizes']>[MediaSizeName]>

type SizePlan = {
  current?: MediaSizeData
  expected: ExpectedSize
  name: MediaSizeName
  reason: 'missing' | 'stale'
}

const mediaSizes: MediaSizeSpec[] = [
  { name: 'thumbnail', width: 240 },
  { name: 'card', width: 640 },
  { name: 'large', width: 1280 },
]

const cacheControlMaxAge = 60 * 60 * 24 * 365

function withProtocol(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const normalized = value.trim().replace(/\/+$/, '')

  if (!normalized) {
    return null
  }

  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return normalized
  }

  return `https://${normalized}`
}

function getMediaFetchOrigin() {
  return (
    withProtocol(process.env.MEDIA_BACKFILL_ORIGIN) ??
    withProtocol(process.env.SITE_URL) ??
    withProtocol(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
    withProtocol(process.env.VERCEL_BRANCH_URL) ??
    withProtocol(process.env.VERCEL_URL) ??
    withProtocol(process.env.PORT ? `http://localhost:${process.env.PORT}` : null) ??
    'http://localhost:3000'
  )
}

function getMediaFetchUrl(media: Media) {
  if (!media.url) {
    throw new Error('media record has no original url')
  }

  try {
    return new URL(media.url).toString()
  } catch {
    return new URL(media.url, getMediaFetchOrigin()).toString()
  }
}

function getBlobBaseUrl() {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  const storeId = token?.match(/^vercel_blob_rw_([a-z\d]+)_[a-z\d]+$/i)?.[1]?.toLowerCase()

  return process.env.STORAGE_VERCEL_BLOB_BASE_URL || (storeId ? `https://${storeId}.public.blob.vercel-storage.com` : null)
}

function encodeBlobPath(pathname: string) {
  return pathname
    .split('/')
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join('/')
}

function getOriginalBlobUrl(media: Media) {
  if (!media.filename) {
    return null
  }

  const baseUrl = getBlobBaseUrl()

  if (!baseUrl) {
    return null
  }

  return `${baseUrl}/${encodeBlobPath(getBlobPathForSize(media, media.filename))}`
}

function getOriginalFetchCandidates(media: Media) {
  return [
    ...new Set(
      [getMediaFetchUrl(media), getOriginalBlobUrl(media)].filter(
        (candidate): candidate is string => Boolean(candidate),
      ),
    ),
  ]
}

const usage = `Usage:
  pnpm media:backfill-sizes
  pnpm media:backfill-sizes -- --ids 72
  pnpm media:backfill-sizes -- --write --confirm-shared-db --ids 72
  pnpm media:backfill-sizes -- --write --confirm-shared-db --limit 5 --start-after 20

Default mode is a dry run. Write mode requires --write and --confirm-shared-db.
Write mode also requires --ids or --limit so the shared dev/prod database cannot be changed accidentally.
`

function parsePositiveInteger(value: string, flag: string) {
  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${flag} must be a positive integer.`)
  }

  return parsed
}

function readFlagValue(args: string[], index: number, flag: string) {
  const value = args[index + 1]

  if (!value || value.startsWith('--')) {
    throw new Error(`${flag} requires a value.`)
  }

  return value
}

function parseArgs(args: string[]): BackfillOptions {
  const options: BackfillOptions = {
    confirmSharedDB: false,
    help: false,
    ids: [],
    write: false,
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]

    if (arg === '--') {
      continue
    }

    const [flag, inlineValue] = arg.split('=')

    switch (flag) {
      case '--confirm-shared-db':
        options.confirmSharedDB = true
        break
      case '--help':
      case '-h':
        options.help = true
        break
      case '--ids': {
        const value = inlineValue ?? readFlagValue(args, index, flag)
        options.ids = value
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean)
          .map((id) => parsePositiveInteger(id, flag))

        if (!inlineValue) {
          index += 1
        }
        break
      }
      case '--limit': {
        const value = inlineValue ?? readFlagValue(args, index, flag)
        options.limit = parsePositiveInteger(value, flag)

        if (!inlineValue) {
          index += 1
        }
        break
      }
      case '--start-after': {
        const value = inlineValue ?? readFlagValue(args, index, flag)
        options.startAfter = parsePositiveInteger(value, flag)

        if (!inlineValue) {
          index += 1
        }
        break
      }
      case '--write':
        options.write = true
        break
      default:
        throw new Error(`Unknown option: ${arg}`)
    }
  }

  if (options.write && !options.confirmSharedDB) {
    throw new Error('Write mode requires --confirm-shared-db.')
  }

  if (options.write && options.ids.length === 0 && !options.limit) {
    throw new Error('Write mode requires --ids or --limit.')
  }

  return options
}

function getMediaExtension(filename: string) {
  const lastDotIndex = filename.lastIndexOf('.')

  if (lastDotIndex <= 0 || lastDotIndex === filename.length - 1) {
    return null
  }

  return filename.slice(lastDotIndex + 1)
}

function getMediaBaseName(filename: string) {
  const lastDotIndex = filename.lastIndexOf('.')

  if (lastDotIndex <= 0) {
    return filename
  }

  return filename.slice(0, lastDotIndex)
}

function getExpectedSize(media: Media, spec: MediaSizeSpec): ExpectedSize | null {
  if (!media.filename || !media.width || !media.height) {
    return null
  }

  const extension = getMediaExtension(media.filename)

  if (!extension) {
    return null
  }

  const width = Math.min(spec.width, media.width)
  const height = Math.round(media.height * (width / media.width))
  const originalName = getMediaBaseName(media.filename)

  return {
    filename: `${originalName}-${spec.name}-${width}x${height}.${extension}`,
    height,
    width,
  }
}

function sizeNeedsBackfill(media: Media, spec: MediaSizeSpec): SizePlan | null {
  const expected = getExpectedSize(media, spec)

  if (!expected) {
    return null
  }

  const current = media.sizes?.[spec.name]

  if (!current?.url || !current.filename || !current.width || !current.height) {
    return {
      current,
      expected,
      name: spec.name,
      reason: 'missing',
    }
  }

  if (
    current.filename !== expected.filename ||
    current.width !== expected.width ||
    current.height !== expected.height
  ) {
    return {
      current,
      expected,
      name: spec.name,
      reason: 'stale',
    }
  }

  return null
}

function getMediaPlan(media: Media) {
  return mediaSizes
    .map((spec) => sizeNeedsBackfill(media, spec))
    .filter((sizePlan): sizePlan is SizePlan => Boolean(sizePlan))
}

function getBlobPathForSize(media: Media, sizeFilename: string) {
  if (!media.url) {
    return sizeFilename
  }

  try {
    const url = new URL(media.url)
    const decodedPath = decodeURIComponent(url.pathname.replace(/^\/+/, ''))
    const lastSlashIndex = decodedPath.lastIndexOf('/')
    const dir = lastSlashIndex === -1 ? '' : decodedPath.slice(0, lastSlashIndex)

    return [dir, sizeFilename].filter(Boolean).join('/')
  } catch {
    return sizeFilename
  }
}

function getMimeType(format?: string) {
  switch (format) {
    case 'avif':
      return 'image/avif'
    case 'gif':
      return 'image/gif'
    case 'jpeg':
    case 'jpg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'tiff':
      return 'image/tiff'
    case 'webp':
      return 'image/webp'
    default:
      return 'application/octet-stream'
  }
}

function formatSizeSummary(size?: SizePlan['current']) {
  if (!size) {
    return 'none'
  }

  return `${size.filename ?? 'no filename'} ${size.width ?? '?'}x${size.height ?? '?'} ${size.url ?? 'no url'}`
}

async function getTargetMedia(options: BackfillOptions) {
  const payload = await getPayload({ config })

  if (options.ids.length > 0) {
    const docs: Media[] = []

    for (const id of options.ids) {
      docs.push(
        await payload.findByID({
          collection: 'media',
          depth: 0,
          id,
        }),
      )
    }

    return { docs, payload }
  }

  const docs: Media[] = []
  let page = 1
  let hasNextPage = true

  while (hasNextPage) {
    const remainingLimit = options.limit ? options.limit - docs.length : undefined

    if (typeof remainingLimit === 'number' && remainingLimit <= 0) {
      break
    }

    const result = await payload.find({
      collection: 'media',
      depth: 0,
      limit: remainingLimit ? Math.min(remainingLimit, 100) : 100,
      page,
      sort: 'id',
      where: options.startAfter
        ? {
            id: {
              greater_than: options.startAfter,
            },
          }
        : undefined,
    })

    docs.push(...result.docs)
    hasNextPage = Boolean(result.hasNextPage)
    page += 1
  }

  return { docs, payload }
}

async function fetchOriginal(media: Media) {
  const failures: string[] = []

  for (const mediaUrl of getOriginalFetchCandidates(media)) {
    try {
      const response = await fetch(mediaUrl)

      if (response.ok) {
        return Buffer.from(await response.arrayBuffer())
      }

      failures.push(`${mediaUrl}: ${response.status} ${response.statusText}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      failures.push(`${mediaUrl}: ${message}`)
    }
  }

  throw new Error(`failed to fetch original; tried ${failures.join('; ')}`)
}

async function writeMediaSizes(media: Media, plan: SizePlan[]) {
  const token = process.env.BLOB_READ_WRITE_TOKEN

  if (!token?.startsWith('vercel_blob_rw_')) {
    throw new Error('BLOB_READ_WRITE_TOKEN is required for write mode.')
  }

  const original = await fetchOriginal(media)
  const nextSizes: NonNullable<Media['sizes']> = { ...(media.sizes ?? {}) }

  for (const sizePlan of plan) {
    const resized = await sharp(original)
      .resize({ width: sizePlan.expected.width, withoutEnlargement: true })
      .toBuffer({ resolveWithObject: true })
    const mimeType = getMimeType(resized.info.format)
    const pathname = getBlobPathForSize(media, sizePlan.expected.filename)
    const blob = await put(pathname, resized.data, {
      access: 'public',
      allowOverwrite: true,
      cacheControlMaxAge,
      contentType: mimeType,
      token,
    })

    nextSizes[sizePlan.name] = {
      filename: sizePlan.expected.filename,
      filesize: resized.info.size,
      height: resized.info.height,
      mimeType,
      url: blob.url,
      width: resized.info.width,
    }
  }

  return nextSizes
}

async function main() {
  const options = parseArgs(process.argv.slice(2))

  if (options.help) {
    console.log(usage)
    return
  }

  console.log(options.write ? 'Running media size backfill in WRITE mode.' : 'Running media size backfill as a dry run.')

  const { docs, payload } = await getTargetMedia(options)
  const failures: string[] = []
  let changedCount = 0

  try {
    for (const media of docs) {
      const plan = getMediaPlan(media)

      if (plan.length === 0) {
        console.log(`[ok] media ${media.id} ${media.filename ?? '(no filename)'} already has current sizes.`)
        continue
      }

      changedCount += 1
      console.log(`[needs-backfill] media ${media.id} ${media.filename ?? '(no filename)'}`)

      for (const sizePlan of plan) {
        console.log(
          `  ${sizePlan.name}: ${sizePlan.reason}; current=${formatSizeSummary(sizePlan.current)}; expected=${sizePlan.expected.filename} ${sizePlan.expected.width}x${sizePlan.expected.height}`,
        )
      }

      if (!options.write) {
        continue
      }

      try {
        const nextSizes = await writeMediaSizes(media, plan)

        await payload.update({
          collection: 'media',
          data: {
            sizes: nextSizes,
          },
          depth: 0,
          id: media.id,
        })

        console.log(`[updated] media ${media.id}`)

        for (const sizePlan of plan) {
          const nextSize = nextSizes[sizePlan.name]

          console.log(
            `  ${sizePlan.name}: ${formatSizeSummary(sizePlan.current)} -> ${formatSizeSummary(nextSize)}`,
          )
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        failures.push(`media ${media.id}: ${message}`)
        console.error(`[failed] media ${media.id}: ${message}`)
      }
    }
  } finally {
    await payload.destroy()
  }

  console.log(
    `${options.write ? 'Write' : 'Dry run'} complete. ${changedCount} of ${docs.length} checked media records need or needed backfill.`,
  )

  if (failures.length > 0) {
    console.error('Failures:')
    failures.forEach((failure) => console.error(`  ${failure}`))
    process.exitCode = 1
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => {
    process.exit(process.exitCode ?? 0)
  })
