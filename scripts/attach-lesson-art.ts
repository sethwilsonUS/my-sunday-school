import dotenv from 'dotenv'
import { getPayload, type Payload } from 'payload'

import type { Lesson, Media } from '../src/payload-types'
import { resolveArtworkImage } from './art-source-resolver'
import {
  getAltText,
  getCaption,
  getProposedFilename,
  parseArtLinks,
  type ArtworkLink,
  type DownloadedArtwork,
} from './lesson-sync-helpers'

dotenv.config({ path: '.env.local' })
dotenv.config()

const { default: config } = await import('../src/payload.config.js')

type Options = {
  artLinksPath?: string
  confirmSharedDB: boolean
  help: boolean
  lessonSlug?: string
  replaceExistingArt: boolean
  write: boolean
}

type MediaMatch = {
  reason: string
  media: Media
}

const usage = `Usage:
  pnpm lesson:attach-art -- --slug 2026-05-10-year-a-sixth-sunday-of-easter --art-links /path/to/art-links-easter6a.md
  pnpm lesson:attach-art -- --write --confirm-shared-db --slug 2026-05-10-year-a-sixth-sunday-of-easter --art-links /path/to/art-links-easter6a.md

Default mode is a dry run: it reads Payload, downloads/validates each artwork image, and prints the exact media/lesson changes it would make. Write mode requires --write and --confirm-shared-db. Use --replace-existing-art when the lesson artwork rows should exactly match the art-links file instead of appending.
`

function readFlagValue(args: string[], index: number, flag: string) {
  const value = args[index + 1]

  if (!value || value.startsWith('--')) {
    throw new Error(`${flag} requires a value.`)
  }

  return value
}

function parseArgs(args: string[]): Options {
  const options: Options = { confirmSharedDB: false, help: false, replaceExistingArt: false, write: false }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]

    if (arg === '--') {
      continue
    }

    const [flag, inlineValue] = arg.split('=')
    const getValue = () => inlineValue ?? readFlagValue(args, index++, flag)

    switch (flag) {
      case '--art-links':
        options.artLinksPath = getValue()
        break
      case '--confirm-shared-db':
        options.confirmSharedDB = true
        break
      case '--help':
      case '-h':
        options.help = true
        break
      case '--replace-existing-art':
        options.replaceExistingArt = true
        break
      case '--slug':
        options.lessonSlug = getValue()
        break
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

  return options
}

function requireValue(value: string | undefined, flag: string) {
  if (!value?.trim()) {
    throw new Error(`${flag} is required.`)
  }

  return value.trim()
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
    resolvedImageReason: resolved.reason,
    resolvedImageSize: resolved.dimensions,
    resolvedImageUrl: resolved.url,
  }
}

async function findLesson(payload: Payload, slug: string) {
  const result = await payload.find({
    collection: 'lessons',
    depth: 2,
    limit: 1,
    where: { slug: { equals: slug } },
  })

  const lesson = result.docs[0]

  if (!lesson) {
    throw new Error(`No lesson found with slug: ${slug}`)
  }

  return lesson
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

function getArtworkImageId(artwork: NonNullable<Lesson['artworks']>[number]) {
  if (typeof artwork.image === 'number') {
    return artwork.image
  }

  return artwork.image.id
}

function artworkRowsHaveMedia(rows: NonNullable<Lesson['artworks']>, mediaId: number) {
  return rows.some((artwork) => getArtworkImageId(artwork) === mediaId)
}

async function createMedia(payload: Payload, artwork: DownloadedArtwork) {
  return payload.create({
    collection: 'media',
    data: {
      altText: getAltText(artwork),
      artist: artwork.artist,
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

async function main() {
  const options = parseArgs(process.argv.slice(2))

  if (options.help) {
    console.log(usage)
    return
  }

  const artLinksPath = requireValue(options.artLinksPath, '--art-links')
  const lessonSlug = requireValue(options.lessonSlug, '--slug')
  const markdown = await import('node:fs/promises').then((fs) => fs.readFile(artLinksPath, 'utf8'))
  const artworks = parseArtLinks(markdown)

  if (artworks.length === 0) {
    throw new Error(`No artwork sections found in ${artLinksPath}`)
  }

  console.log(options.write ? 'Running lesson art attach in WRITE mode.' : 'Running lesson art attach as a dry run.')
  console.log(`Art links: ${artLinksPath}`)
  console.log(`Lesson slug: ${lessonSlug}`)
  console.log(`Artwork row mode: ${options.replaceExistingArt ? 'replace existing lesson artwork rows' : 'append missing artwork rows'}`)
  console.log(`Parsed artworks: ${artworks.length}\n`)

  const payload = await getPayload({ config })

  try {
    const lesson = await findLesson(payload, lessonSlug)
    console.log(`Found lesson: ${lesson.title} (id ${lesson.id}, status ${lesson.status})`)
    console.log(`Existing attached artwork rows: ${lesson.artworks?.length ?? 0}\n`)

    const existingArtworkRows = lesson.artworks ?? []
    const attachmentRows: NonNullable<Lesson['artworks']> = options.replaceExistingArt ? [] : [...existingArtworkRows]
    let mediaRecordsCreated = 0
    let mediaRecordsPlanned = 0
    let lessonArtworkRowsAdded = 0
    let lessonArtworkRowsPlanned = 0

    if (options.replaceExistingArt) {
      console.log(`Replacement mode: existing attached artwork rows will be replaced with ${artworks.length} row(s) from the art-links file.\n`)
    }

    for (const [index, artwork] of artworks.entries()) {
      console.log(`[${index + 1}/${artworks.length}] ${artwork.heading}`)
      const downloaded = await downloadArtwork(artwork)
      const existingMedia = await findExistingMedia(payload, downloaded)

      console.log(`  source: ${downloaded.sourceUrl}`)
      console.log(`  image: ${downloaded.imageUrl}`)
      if (downloaded.resolvedImageUrl && downloaded.resolvedImageUrl !== downloaded.imageUrl) {
        console.log(`  resolved upload: ${downloaded.resolvedImageUrl}`)
        console.log(`  resolved reason: ${downloaded.resolvedImageReason ?? 'best validated candidate'}`)
      }

      if (downloaded.resolvedImageSize) {
        console.log(`  resolved dimensions: ${downloaded.resolvedImageSize.width}x${downloaded.resolvedImageSize.height}`)
      }

      console.log(`  downloaded: ${downloaded.mimeType}, ${downloaded.contentLength.toLocaleString()} bytes, sha256 ${downloaded.hash.slice(0, 12)}…`)
      console.log(`  proposed filename: ${downloaded.proposedFilename}`)
      console.log(`  alt text: ${getAltText(downloaded)}`)
      console.log(`  caption: ${getCaption(downloaded)}`)

      let mediaId: number | null = null

      if (existingMedia) {
        mediaId = existingMedia.media.id
        console.log(`  media: reuse id ${mediaId} (${existingMedia.reason})`)
      } else if (options.write) {
        const media = await createMedia(payload, downloaded)
        mediaId = media.id
        mediaRecordsCreated += 1
        console.log(`  media: created id ${mediaId}`)
      } else {
        mediaRecordsPlanned += 1
        console.log('  media: would upload new media record')
      }

      if (mediaId && artworkRowsHaveMedia(attachmentRows, mediaId)) {
        console.log('  lesson: already queued in target artwork rows; skipped duplicate')
      } else if (mediaId) {
        lessonArtworkRowsAdded += options.write ? 1 : 0
        lessonArtworkRowsPlanned += options.write ? 0 : 1
        attachmentRows.push({ image: mediaId, caption: getCaption(downloaded) })
        console.log(options.write ? '  lesson: queued target artwork row' : '  lesson: would include existing/created media in target artwork rows')
      } else {
        lessonArtworkRowsPlanned += 1
        console.log('  lesson: would include newly uploaded media in target artwork rows')
      }

      console.log('')
    }

    if (options.write) {
      await payload.update({
        collection: 'lessons',
        data: { artworks: attachmentRows },
        depth: 0,
        id: lesson.id,
        overrideAccess: true,
      })
    }

    console.log(`${options.write ? 'Write' : 'Dry run'} complete.`)

    if (options.write) {
      console.log(`Created new media records: ${mediaRecordsCreated}`)
      console.log(`Added lesson artwork rows: ${lessonArtworkRowsAdded}`)
      console.log(`Final lesson artwork rows: ${attachmentRows.length}`)
      console.log('Payload writes were made.')
    } else {
      console.log(`Would upload new media records: ${mediaRecordsPlanned}`)
      console.log(`Would add lesson artwork rows: ${lessonArtworkRowsPlanned}`)
      console.log(`Would set final lesson artwork rows to: ${attachmentRows.length + mediaRecordsPlanned}`)
      console.log('No Payload writes were made.')
    }
  } finally {
    await payload.destroy()
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
