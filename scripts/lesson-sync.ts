import { readFile } from 'node:fs/promises'

import dotenv from 'dotenv'
import { getPayload, type Payload } from 'payload'

import { SEASON_OPTIONS } from '../src/lib/liturgical-themes'
import type { Lesson, Media } from '../src/payload-types'
import { resolveArtworkImage } from './art-source-resolver'
import {
  buildLessonSyncData,
  chooseLessonSyncTarget,
  getAltText,
  getCaption,
  getProposedFilename,
  mergeArtworkRowCaption,
  normalizeSourceLectionaryUrl,
  parseArtLinks,
  slugify,
  type ArtworkLink,
  type DownloadedArtwork,
  type ExistingLessonForSync,
  type LiturgicalSeasonValue,
  type LessonSyncInput,
} from './lesson-sync-helpers'

dotenv.config({ path: '.env.local' })
dotenv.config()

const { default: config } = await import('../src/payload.config.js')

type Options = {
  allowPublishedArt: boolean
  artLinksPath?: string
  collect?: string
  confirmSharedDB: boolean
  date?: string
  help: boolean
  lectionaryYear?: 'A' | 'B' | 'C'
  replaceExistingArt: boolean
  season?: string
  slug?: string
  sourceUrl?: string
  title?: string
  write: boolean
}

type LessonWithSource = Lesson & {
  sourceLectionaryUrl?: string | null
}

type MediaMatch = {
  media: Media
  reason: string
}

const usage = `Usage:
  pnpm lesson:sync -- --date 2026-05-10 --title "Sixth Sunday of Easter" --season easter --year A --slug 2026-05-10-easter-6a --source-url https://www.episcopalchurch.org/lectionary/easter-6a/ --collect "O God..." --art-links /path/to/art-links.md --allow-published-art --replace-existing-art
  pnpm lesson:sync -- --write --confirm-shared-db --date 2026-05-10 --title "Sixth Sunday of Easter" --season easter --year A --slug 2026-05-10-easter-6a --source-url https://www.episcopalchurch.org/lectionary/easter-6a/ --collect "O God..." --art-links /path/to/art-links.md --allow-published-art --replace-existing-art

Default mode is a dry run. Write mode requires --write and --confirm-shared-db. Matching is by sourceLectionaryUrl + date first, then slug. Published matches are blocked by default; --allow-published-art permits an art-only append/replace when --art-links is present.
`

function readFlagValue(args: string[], index: number, flag: string) {
  const value = args[index + 1]

  if (!value || value.startsWith('--')) {
    throw new Error(`${flag} requires a value.`)
  }

  return value
}

function parseArgs(args: string[]): Options {
  const options: Options = { allowPublishedArt: false, confirmSharedDB: false, help: false, replaceExistingArt: false, write: false }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]

    if (arg === '--') {
      continue
    }

    const [flag, inlineValue] = arg.split('=')
    const getValue = () => inlineValue ?? readFlagValue(args, index++, flag)

    switch (flag) {
      case '--allow-published-art':
        options.allowPublishedArt = true
        break
      case '--art-links':
        options.artLinksPath = getValue()
        break
      case '--confirm-shared-db':
        options.confirmSharedDB = true
        break
      case '--collect':
        options.collect = getValue()
        break
      case '--date':
        options.date = getValue()
        break
      case '--help':
      case '-h':
        options.help = true
        break
      case '--replace-existing-art':
        options.replaceExistingArt = true
        break
      case '--season':
        options.season = getValue()
        break
      case '--slug':
        options.slug = getValue()
        break
      case '--source-url':
        options.sourceUrl = getValue()
        break
      case '--title':
        options.title = getValue()
        break
      case '--write':
        options.write = true
        break
      case '--year': {
        const value = getValue()
        if (!['A', 'B', 'C'].includes(value)) {
          throw new Error('--year must be A, B, or C.')
        }
        options.lectionaryYear = value as 'A' | 'B' | 'C'
        break
      }
      default:
        throw new Error(`Unknown option: ${arg}`)
    }
  }

  if (options.write && !options.confirmSharedDB) {
    throw new Error('Write mode requires --confirm-shared-db.')
  }

  if (options.allowPublishedArt && !options.artLinksPath) {
    throw new Error('--allow-published-art requires --art-links.')
  }

  return options
}

function requireDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('--date is required in YYYY-MM-DD format.')
  }

  return value
}

function requireTitle(value: string | undefined) {
  if (!value?.trim()) {
    throw new Error('--title is required.')
  }

  return value.trim()
}

function requireSeason(value: string | undefined) {
  const allowed = new Set(SEASON_OPTIONS.map((option) => option.value))

  if (!value || !allowed.has(value as never)) {
    throw new Error(`--season is required. Allowed: ${[...allowed].join(', ')}`)
  }

  return value as LiturgicalSeasonValue
}

function optionsToSyncInput(options: Options): LessonSyncInput {
  const date = requireDate(options.date)
  const title = requireTitle(options.title)
  const liturgicalSeason = requireSeason(options.season)
  const slug = options.slug?.trim() || slugify([date, title].join(' '))

  return {
    collect: options.collect,
    date,
    lectionaryYear: options.lectionaryYear,
    liturgicalSeason,
    slug,
    sourceUrl: options.sourceUrl,
    title,
  }
}

async function downloadArtwork(artwork: ArtworkLink): Promise<DownloadedArtwork> {
  const resolved = await resolveArtworkImage(artwork)

  return {
    ...artwork,
    buffer: resolved.buffer,
    contentLength: resolved.contentLength,
    hash: resolved.sha256,
    imageUrl: artwork.imageUrl,
    mimeType: resolved.mimeType,
    proposedFilename: getProposedFilename(artwork, resolved.mimeType, resolved.url),
    resolvedImageUrl: resolved.url,
    resolvedImageReason: resolved.reason,
    resolvedImageSize: resolved.dimensions,
  }
}

async function findLessonCandidates(payload: Payload, input: LessonSyncInput) {
  const candidates = new Map<number | string, LessonWithSource>()
  const normalizedSourceUrl = normalizeSourceLectionaryUrl(input.sourceUrl)

  if (normalizedSourceUrl) {
    const sourceMatches = await payload.find({
      collection: 'lessons',
      depth: 2,
      limit: 10,
      where: { sourceLectionaryUrl: { equals: normalizedSourceUrl } },
    })

    for (const lesson of sourceMatches.docs) {
      candidates.set(lesson.id, lesson as LessonWithSource)
    }
  }

  const slugMatches = await payload.find({
    collection: 'lessons',
    depth: 2,
    limit: 5,
    where: { slug: { equals: input.slug } },
  })

  for (const lesson of slugMatches.docs) {
    candidates.set(lesson.id, lesson as LessonWithSource)
  }

  return [...candidates.values()]
}

async function findExistingMedia(payload: Payload, artwork: DownloadedArtwork): Promise<MediaMatch | null> {
  const filenameMatches = await payload.find({
    collection: 'media',
    depth: 0,
    limit: 1,
    where: { filename: { equals: artwork.proposedFilename } },
  })

  if (filenameMatches.docs[0]) {
    return { media: filenameMatches.docs[0], reason: `filename matches ${artwork.proposedFilename}` }
  }

  return findExistingMediaBySource(payload, artwork)
}

async function findExistingMediaBySource(
  payload: Payload,
  artwork: Pick<ArtworkLink, 'alternateSourceUrl' | 'sourceUrl'>,
): Promise<MediaMatch | null> {
  const sourceMatches = await payload.find({
    collection: 'media',
    depth: 0,
    limit: 1,
    where: { wikimediaUrl: { equals: artwork.sourceUrl } },
  })

  if (sourceMatches.docs[0]) {
    return { media: sourceMatches.docs[0], reason: `source URL matches ${artwork.sourceUrl}` }
  }

  if (artwork.alternateSourceUrl) {
    const alternateSourceMatches = await payload.find({
      collection: 'media',
      depth: 0,
      limit: 1,
      where: { wikimediaUrl: { equals: artwork.alternateSourceUrl } },
    })

    if (alternateSourceMatches.docs[0]) {
      return { media: alternateSourceMatches.docs[0], reason: `alternate source URL matches ${artwork.alternateSourceUrl}` }
    }
  }

  return null
}

async function createMedia(payload: Payload, artwork: DownloadedArtwork) {
  return payload.create({
    collection: 'media',
    data: {
      altText: getAltText(artwork),
      artist: artwork.artist,
      medium: artwork.medium,
      workDate: artwork.workDate,
      wikimediaUrl: artwork.sourceUrl,
    },
    depth: 0,
    file: {
      data: artwork.buffer,
      mimetype: artwork.mimeType,
      name: artwork.proposedFilename,
      size: artwork.contentLength,
    },
    overrideAccess: true,
  })
}

async function syncArtwork({
  artLinksPath,
  existingLesson,
  payload,
  replaceExistingArt,
  write,
}: {
  artLinksPath: string
  existingLesson?: LessonWithSource
  payload: Payload
  replaceExistingArt: boolean
  write: boolean
}) {
  const markdown = await readFile(artLinksPath, 'utf8')
  const artworks = parseArtLinks(markdown)

  if (artworks.length === 0) {
    throw new Error(`No artwork sections found in ${artLinksPath}`)
  }

  const existingArtworkRows = existingLesson?.artworks ?? []
  const attachmentRows: NonNullable<Lesson['artworks']> = replaceExistingArt ? [] : [...existingArtworkRows]
  let mediaRecordsCreated = 0
  let mediaRecordsPlanned = 0
  let lessonArtworkRowsAdded = 0
  let lessonArtworkRowsPlanned = 0
  let lessonArtworkRowsUpdated = 0

  console.log(`Art links: ${artLinksPath}`)
  console.log(`Artwork row mode: ${replaceExistingArt ? 'replace existing lesson artwork rows' : 'append missing artwork rows'}`)
  console.log(`Parsed artworks: ${artworks.length}\n`)

  for (const [index, artwork] of artworks.entries()) {
    console.log(`[${index + 1}/${artworks.length}] ${artwork.heading}`)
    const caption = getCaption(artwork)

    console.log(`  source: ${artwork.sourceUrl}`)
    console.log(`  image: ${artwork.imageUrl}`)
    console.log(`  alt text: ${getAltText(artwork)}`)
    console.log(`  caption: ${caption}`)

    let mediaId: number | null = null
    const sourceMedia = await findExistingMediaBySource(payload, artwork)

    if (sourceMedia) {
      mediaId = sourceMedia.media.id
      console.log(`  media: reuse id ${mediaId} (${sourceMedia.reason}; skipped download)`)
    } else {
      const downloaded = await downloadArtwork(artwork)
      const existingMedia = await findExistingMedia(payload, downloaded)

      if (downloaded.resolvedImageUrl && downloaded.resolvedImageUrl !== downloaded.imageUrl) {
        console.log(`  resolved upload: ${downloaded.resolvedImageUrl}`)
        console.log(`  resolved reason: ${downloaded.resolvedImageReason ?? 'best validated candidate'}`)
      }

      if (downloaded.resolvedImageSize) {
        console.log(`  resolved dimensions: ${downloaded.resolvedImageSize.width}x${downloaded.resolvedImageSize.height}`)
      }

      console.log(`  downloaded: ${downloaded.mimeType}, ${downloaded.contentLength.toLocaleString()} bytes, sha256 ${downloaded.hash.slice(0, 12)}`)
      console.log(`  proposed filename: ${downloaded.proposedFilename}`)

      if (existingMedia) {
        mediaId = existingMedia.media.id
        console.log(`  media: reuse id ${mediaId} (${existingMedia.reason})`)
      } else if (write) {
        const media = await createMedia(payload, downloaded)
        mediaId = media.id
        mediaRecordsCreated += 1
        console.log(`  media: created id ${mediaId}`)
      } else {
        mediaRecordsPlanned += 1
        lessonArtworkRowsPlanned += 1
        console.log('  media: would upload new media record')
        console.log('  lesson: would include newly uploaded media in target artwork rows')
        console.log('')
        continue
      }
    }

    if (mediaId) {
      const rowChange = mergeArtworkRowCaption(
        attachmentRows,
        mediaId,
        caption,
        (image, rowCaption) => ({ image, caption: rowCaption }),
      )

      if (rowChange === 'added') {
        if (write) {
          lessonArtworkRowsAdded += 1
          console.log('  lesson: queued target artwork row')
        } else {
          lessonArtworkRowsPlanned += 1
          console.log('  lesson: would include existing media in target artwork rows')
        }
      } else if (rowChange === 'updated') {
        lessonArtworkRowsUpdated += 1
        console.log(write ? '  lesson: updated existing artwork caption' : '  lesson: would update existing artwork caption')
      } else {
        console.log('  lesson: already queued in target artwork rows with current caption')
      }
    }

    console.log('')
  }

  return {
    attachmentRows,
    finalArtworkRowCount: attachmentRows.length + mediaRecordsPlanned,
    mediaRecordsCreated,
    mediaRecordsPlanned,
    lessonArtworkRowsAdded,
    lessonArtworkRowsPlanned,
    lessonArtworkRowsUpdated,
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))

  if (options.help) {
    console.log(usage)
    return
  }

  const input = optionsToSyncInput(options)
  const lessonData = buildLessonSyncData(input)
  const lessonUrl = `https://lectionarylessons.org/lessons/${input.slug}`

  console.log(options.write ? 'Running lesson sync in WRITE mode.' : 'Running lesson sync as a dry run.')
  console.log(`Lesson slug: ${input.slug}`)
  console.log(`Source lectionary URL: ${lessonData.sourceLectionaryUrl ?? 'not provided'}`)
  console.log(`Future/public URL after publish: ${lessonUrl}`)
  console.log('')

  const payload = await getPayload({ config })

  try {
    const candidates = await findLessonCandidates(payload, input).catch((error: unknown) => {
      if (isMissingSourceLectionaryUrlColumn(error)) {
        throw new Error(
          'The lessons.sourceLectionaryUrl column is missing. Run the generated Payload migration before lesson:sync can match by source URL/date.',
        )
      }

      throw error
    })
    const target = chooseLessonSyncTarget(input, candidates as ExistingLessonForSync[], {
      allowPublishedArtUpdate: options.allowPublishedArt && Boolean(options.artLinksPath),
    })

    if (target.action === 'blocked-published') {
      console.log(`Matched published lesson by ${target.matchReason}: ${target.lesson.title} (id ${target.lesson.id})`)
      throw new Error('Matching lesson is published; refusing to update without --allow-published-art and --art-links.')
    }

    if (target.action === 'update-published-art') {
      console.log('Planned lesson metadata: skipped because --allow-published-art is art-only for published lessons.')
      console.log('')
    } else {
      console.log('Planned lesson metadata:')
      console.log(JSON.stringify(lessonData, null, 2))
      console.log('')
    }

    let lesson: LessonWithSource | undefined

    if (target.action === 'create-draft') {
      console.log('Lesson match: none found.')
      console.log(options.write ? 'Action: create draft lesson.' : 'Action: would create draft lesson.')

      if (options.write) {
        lesson = await payload.create({
          collection: 'lessons',
          data: lessonData,
          depth: 2,
          overrideAccess: true,
        }) as LessonWithSource
        console.log(`Created draft lesson: ${lesson.title}`)
      }
    } else if (target.action === 'update-draft') {
      lesson = target.lesson as LessonWithSource
      console.log(`Lesson match: ${target.matchReason} -> ${lesson.title} (id ${lesson.id}, status ${lesson.status})`)
      console.log(options.write ? 'Action: update draft lesson metadata.' : 'Action: would update draft lesson metadata.')

      if (options.write) {
        lesson = await payload.update({
          collection: 'lessons',
          data: lessonData,
          depth: 2,
          id: lesson.id,
          overrideAccess: true,
        }) as LessonWithSource
        console.log(`Updated draft lesson: ${lesson.title}`)
      }
    } else {
      lesson = target.lesson as LessonWithSource
      console.log(`Lesson match: ${target.matchReason} -> ${lesson.title} (id ${lesson.id}, status ${lesson.status})`)
      console.log(options.write ? 'Action: update published lesson artwork only.' : 'Action: would update published lesson artwork only.')
    }

    let artworkSummary:
      | Awaited<ReturnType<typeof syncArtwork>>
      | undefined

    if (options.artLinksPath) {
      artworkSummary = await syncArtwork({
        artLinksPath: options.artLinksPath,
        existingLesson: lesson,
        payload,
        replaceExistingArt: options.replaceExistingArt,
        write: options.write,
      })

      if (options.write && lesson) {
        await payload.update({
          collection: 'lessons',
          data: { artworks: artworkSummary.attachmentRows },
          depth: 0,
          id: lesson.id,
          overrideAccess: true,
        })
      }
    } else {
      console.log('Art links: not provided; metadata only sync.')
    }

    console.log(`${options.write ? 'Write' : 'Dry run'} complete.`)
    console.log(`Slug: ${input.slug}`)
    console.log(`Future/public URL after publish: ${lessonUrl}`)

    if (artworkSummary) {
      if (options.write) {
        console.log(`Created new media records: ${artworkSummary.mediaRecordsCreated}`)
        console.log(`Added lesson artwork rows: ${artworkSummary.lessonArtworkRowsAdded}`)
        console.log(`Updated lesson artwork captions: ${artworkSummary.lessonArtworkRowsUpdated}`)
        console.log(`Final lesson artwork rows: ${artworkSummary.attachmentRows.length}`)
        console.log('Payload writes were made.')
      } else {
        console.log(`Would upload new media records: ${artworkSummary.mediaRecordsPlanned}`)
        console.log(`Would add lesson artwork rows: ${artworkSummary.lessonArtworkRowsPlanned}`)
        console.log(`Would update lesson artwork captions: ${artworkSummary.lessonArtworkRowsUpdated}`)
        console.log(`Would set final lesson artwork rows to: ${artworkSummary.finalArtworkRowCount}`)
        console.log('No Payload writes were made.')
      }
    } else {
      console.log(options.write ? 'Payload writes were made.' : 'No Payload writes were made.')
    }
  } finally {
    await payload.destroy()
  }
}

function isMissingSourceLectionaryUrlColumn(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return /source_lectionary_url/i.test(message)
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => {
    process.exit(process.exitCode ?? 0)
  })
