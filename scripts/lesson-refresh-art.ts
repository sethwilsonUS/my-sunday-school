import dotenv from 'dotenv'
import { getPayload, type Payload } from 'payload'

import type { Lesson, Media } from '../src/payload-types'
import { resolveArtworkImage } from './art-source-resolver'
import {
  getRefreshAction,
  parseRefreshArtArgs,
  refreshArtUsage,
  refreshFilenameForMedia,
  type RefreshArtOptions,
} from './lesson-refresh-art-helpers'

dotenv.config({ path: '.env.local' })
dotenv.config()

type LessonArtworkRow = NonNullable<Lesson['artworks']>[number]

type RefreshTarget = {
  caption?: string | null
  lesson?: Pick<Lesson, 'id' | 'slug' | 'title'>
  media: Media
}

type RefreshTargetResult = 'would-refresh' | 'refreshed' | 'skipped'

const PUBLISHED_TARGET_DELAY_MS = 750

async function main() {
  const options = parseRefreshArtArgs(process.argv.slice(2))

  if (options.help) {
    console.log(refreshArtUsage)
    return
  }

  console.log(options.write ? 'Running lesson art refresh in WRITE mode.' : 'Running lesson art refresh as a dry run.')

  const { default: config } = await import('../src/payload.config.js')
  const payload = await getPayload({ config })
  const failures: string[] = []
  let refreshed = 0
  let skipped = 0
  let wouldRefresh = 0

  try {
    const targets = await getRefreshTargets(payload, options)

    console.log(`Refresh targets: ${targets.length}`)

    for (const [index, target] of targets.entries()) {
      try {
        if (index > 0 && options.published) {
          await delay(PUBLISHED_TARGET_DELAY_MS)
        }

        const result = await refreshTarget(payload, target, options)

        if (result === 'refreshed') {
          refreshed += 1
        } else if (result === 'would-refresh') {
          wouldRefresh += 1
        } else {
          skipped += 1
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        failures.push(`media ${target.media.id}: ${message}`)
        console.error(`[failed] media ${target.media.id}: ${message}`)
      }
    }
  } finally {
    await payload.destroy()
  }

  console.log(
    `${options.write ? 'Write' : 'Dry run'} complete. Would refresh: ${wouldRefresh}. Refreshed: ${refreshed}. Skipped: ${skipped}. Failures: ${failures.length}.`,
  )

  if (failures.length > 0) {
    console.error('Failures:')
    failures.forEach((failure) => console.error(`  ${failure}`))
    process.exitCode = 1
  }
}

async function getRefreshTargets(payload: Payload, options: RefreshArtOptions): Promise<RefreshTarget[]> {
  if (options.ids.length > 0) {
    const targets: RefreshTarget[] = []

    for (const id of uniqueIds(options.ids)) {
      targets.push({
        media: await payload.findByID({
          collection: 'media',
          depth: 0,
          id,
        }),
      })
    }

    return limitRefreshTargets(targets, options)
  }

  const lessons = await getTargetLessons(payload, options)
  const byMediaId = new Map<number | string, RefreshTarget>()

  for (const lesson of lessons) {
    for (const row of lesson.artworks ?? []) {
      const media = getArtworkMedia(row)

      if (!media || byMediaId.has(media.id)) {
        continue
      }

      byMediaId.set(media.id, {
        caption: row.caption,
        lesson: {
          id: lesson.id,
          slug: lesson.slug,
          title: lesson.title,
        },
        media,
      })
    }
  }

  return limitRefreshTargets([...byMediaId.values()], options)
}

async function getTargetLessons(payload: Payload, options: RefreshArtOptions) {
  if (options.slug) {
    const result = await payload.find({
      collection: 'lessons',
      depth: 2,
      limit: 1,
      where: {
        slug: {
          equals: options.slug,
        },
      },
    })

    if (!result.docs[0]) {
      throw new Error(`No lesson found with slug: ${options.slug}`)
    }

    return result.docs
  }

  if (!options.published) {
    throw new Error('Use --slug, --ids, or --published.')
  }

  const docs: Lesson[] = []
  let page = 1
  let hasNextPage = true

  while (hasNextPage) {
    const result = await payload.find({
      collection: 'lessons',
      depth: 2,
      limit: 100,
      page,
      sort: 'id',
      where: {
        ...(options.startAfter
          ? {
              id: {
                greater_than: options.startAfter,
              },
            }
          : {}),
        status: {
          equals: 'published',
        },
      },
    })

    docs.push(...result.docs)
    hasNextPage = Boolean(result.hasNextPage)
    page += 1
  }

  return docs
}

function getArtworkMedia(row: LessonArtworkRow) {
  return typeof row.image === 'object' && row.image !== null ? row.image : null
}

function uniqueIds(ids: number[]) {
  return [...new Set(ids)]
}

function limitRefreshTargets(targets: RefreshTarget[], options: RefreshArtOptions) {
  return options.limit ? targets.slice(0, options.limit) : targets
}

function canResolveRefreshCandidate(media: Media) {
  return isAbsoluteHttpUrl(media.url) || isAbsoluteHttpUrl(media.wikimediaUrl)
}

function isAbsoluteHttpUrl(value: string | null | undefined) {
  return Boolean(value && /^https?:\/\//i.test(value))
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function refreshTarget(
  payload: Payload,
  target: RefreshTarget,
  options: RefreshArtOptions,
): Promise<RefreshTargetResult> {
  const media = target.media

  console.log(`[media ${media.id}] ${media.filename ?? '(no filename)'}`)
  if (target.lesson) {
    console.log(`  lesson: ${target.lesson.slug} (${target.lesson.title})`)
  }
  console.log(`  current: ${media.width ?? '?'}x${media.height ?? '?'} ${media.filesize?.toLocaleString() ?? '?'} bytes`)

  if (!canResolveRefreshCandidate(media)) {
    console.log('  candidate: unavailable')
    console.log('  decision: skip (media has no absolute image or source URL to resolve)')
    return 'skipped'
  }

  const resolved = await resolveArtworkImage({
    artist: media.artist,
    imageUrl: media.url,
    sourceUrl: media.wikimediaUrl,
    title: media.altText,
    workDate: media.workDate,
  }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    console.log('  candidate: unavailable')
    console.log(`  decision: skip (candidate could not be resolved: ${message})`)
    return null
  })

  if (!resolved) {
    return 'skipped'
  }

  const action = getRefreshAction(
    {
      artist: media.artist,
      filename: media.filename,
      height: media.height,
      id: media.id,
      sourceUrl: media.wikimediaUrl,
      title: media.altText,
      width: media.width,
      workDate: media.workDate,
    },
    resolved,
  )

  console.log(
    `  candidate: ${resolved.dimensions.width}x${resolved.dimensions.height} ${resolved.contentLength.toLocaleString()} bytes`,
  )
  console.log(`  candidate url: ${resolved.url}`)
  console.log(`  decision: ${action.action} (${action.reason})`)

  if (action.action !== 'refresh') {
    return 'skipped' as const
  }

  if (!options.write) {
    console.log('  write: would refresh existing media original')
    return 'would-refresh'
  }

  const filename = refreshFilenameForMedia(media, resolved.mimeType)

  await payload.update({
    collection: 'media',
    data: {
      altText: media.altText,
      artist: media.artist,
      artistDates: media.artistDates,
      medium: media.medium,
      wikimediaUrl: media.wikimediaUrl,
      workDate: media.workDate,
    },
    depth: 0,
    file: {
      data: resolved.buffer,
      mimetype: resolved.mimeType,
      name: filename,
      size: resolved.contentLength,
    },
    id: media.id,
    overwriteExistingFiles: true,
    overrideAccess: true,
  })

  console.log('  write: refreshed existing media original')
  return 'refreshed'
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => {
    process.exit(process.exitCode ?? 0)
  })
