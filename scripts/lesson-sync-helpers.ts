import path from 'node:path'

export type LessonSyncInput = {
  date: string
  lectionaryYear?: 'A' | 'B' | 'C'
  liturgicalSeason: LiturgicalSeasonValue
  slug: string
  sourceUrl?: string
  title: string
}

export type LiturgicalSeasonValue =
  | 'advent'
  | 'christmas'
  | 'epiphany'
  | 'lent'
  | 'holy-week'
  | 'easter'
  | 'pentecost'
  | 'ordinary-time'

export type ExistingLessonForSync = {
  date?: string | null
  id: number | string
  slug?: string | null
  sourceLectionaryUrl?: string | null
  status?: 'draft' | 'published' | string | null
  title?: string | null
}

export type LessonSyncTarget =
  | {
      action: 'create-draft'
      lesson?: undefined
      matchReason?: undefined
    }
  | {
      action: 'update-draft' | 'blocked-published'
      lesson: ExistingLessonForSync
      matchReason: 'slug' | 'source-url-date'
    }

export type ArtworkLink = {
  alternateImageUrl?: string
  alternateSourceUrl?: string
  artist: string
  heading: string
  imageUrl: string
  note?: string
  sourceUrl: string
  title: string
  workDate?: string
}

export type DownloadedArtwork = ArtworkLink & {
  buffer: Buffer
  contentLength: number
  hash: string
  mimeType: string
  proposedFilename: string
}

export function normalizeSourceLectionaryUrl(value: string | undefined) {
  if (!value?.trim()) {
    return undefined
  }

  try {
    const url = new URL(value.trim())
    url.hash = ''
    url.search = ''
    url.hostname = url.hostname.replace(/^www\./, '').toLowerCase()
    url.pathname = url.pathname.replace(/\/+$/, '').toLowerCase()
    return url.toString()
  } catch {
    return undefined
  }
}

export function chooseLessonSyncTarget(
  input: LessonSyncInput,
  lessons: ExistingLessonForSync[],
): LessonSyncTarget {
  const normalizedSourceUrl = normalizeSourceLectionaryUrl(input.sourceUrl)
  const date = input.date.slice(0, 10)

  const sourceMatch = normalizedSourceUrl
    ? lessons.find((lesson) => {
        const lessonDate = lesson.date?.slice(0, 10)
        return (
          lessonDate === date &&
          normalizeSourceLectionaryUrl(lesson.sourceLectionaryUrl ?? undefined) === normalizedSourceUrl
        )
      })
    : undefined

  if (sourceMatch) {
    return lessonTargetFor(sourceMatch, 'source-url-date')
  }

  const slugMatch = lessons.find((lesson) => lesson.slug === input.slug)

  if (slugMatch) {
    return lessonTargetFor(slugMatch, 'slug')
  }

  return { action: 'create-draft' }
}

export function buildLessonSyncData(input: LessonSyncInput) {
  return {
    date: input.date,
    lectionaryYear: input.lectionaryYear,
    liturgicalSeason: input.liturgicalSeason,
    slug: input.slug,
    sourceLectionaryUrl: normalizeSourceLectionaryUrl(input.sourceUrl),
    status: 'draft' as const,
    title: input.title,
  }
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function parseArtLinks(markdown: string) {
  const artworks: ArtworkLink[] = []
  const sections = markdown.split(/\n(?=##\s+)/g)

  for (const section of sections) {
    const headingMatch = section.match(/^##\s+(.+)$/m)

    if (!headingMatch || /^##\s+Related\b/i.test(headingMatch[0])) {
      continue
    }

    const heading = headingMatch[1].trim()
    const fields = new Map<string, string>()

    for (const line of section.split('\n')) {
      const fieldMatch = line.match(/^-\s+([^:]+):\s*(.+)$/)

      if (fieldMatch) {
        fields.set(fieldMatch[1].trim().toLowerCase(), fieldMatch[2].trim())
      }
    }

    const sourceUrl = fields.get('source')
    const imageUrl = fields.get('image')

    if (!sourceUrl || !imageUrl) {
      throw new Error(`Artwork section is missing Source or Image: ${heading}`)
    }

    const parsedHeading = parseHeading(heading)

    artworks.push({
      ...parsedHeading,
      alternateImageUrl:
        fields.get('alternate image') ??
        fields.get('alternate commons image') ??
        fields.get('higher-resolution alternate image') ??
        fields.get('alternate image used in the handout'),
      alternateSourceUrl:
        fields.get('alternate source') ??
        fields.get('alternate commons source') ??
        fields.get('higher-resolution alternate source') ??
        fields.get('alternate source used in the handout'),
      heading,
      imageUrl,
      note: fields.get('note'),
      sourceUrl,
    })
  }

  return artworks
}

export function getAltText(artwork: ArtworkLink) {
  return `${artwork.title} by ${artwork.artist}${artwork.workDate ? `, ${artwork.workDate}` : ''}.`
}

export function getCaption(artwork: ArtworkLink) {
  return `${artwork.artist}, ${artwork.title}${artwork.workDate ? ` (${artwork.workDate})` : ''}`
}

export function getProposedFilename(artwork: ArtworkLink, mimeType: string) {
  const extension = getExtensionFromUrl(artwork.imageUrl) ?? getExtensionFromMimeType(mimeType) ?? 'jpg'
  const dateSuffix = artwork.workDate ? `-${slugify(artwork.workDate)}` : ''

  return `${slugify(`${artwork.artist}-${artwork.title}`)}${dateSuffix}.${extension}`
}

function lessonTargetFor(
  lesson: ExistingLessonForSync,
  matchReason: 'slug' | 'source-url-date',
): LessonSyncTarget {
  return {
    action: lesson.status === 'published' ? 'blocked-published' : 'update-draft',
    lesson,
    matchReason,
  }
}

function stripMarkdown(value: string) {
  return value.replace(/\*\*/g, '').replace(/\*/g, '').replace(/\s+/g, ' ').trim()
}

function parseHeading(heading: string) {
  const normalized = stripMarkdown(heading.replace(/^#+\s*/, ''))
  const firstCommaIndex = normalized.indexOf(',')

  if (firstCommaIndex === -1) {
    return {
      artist: normalized,
      title: normalized,
      workDate: undefined,
    }
  }

  const artist = normalized.slice(0, firstCommaIndex).trim()
  const rest = normalized.slice(firstCommaIndex + 1).trim()
  const lastCommaIndex = rest.lastIndexOf(',')

  if (lastCommaIndex === -1) {
    return {
      artist,
      title: rest,
      workDate: undefined,
    }
  }

  return {
    artist,
    title: rest.slice(0, lastCommaIndex).trim(),
    workDate: rest.slice(lastCommaIndex + 1).trim() || undefined,
  }
}

function getExtensionFromUrl(url: string) {
  try {
    const extension = path.extname(new URL(url).pathname).replace(/^\./, '').toLowerCase()

    if (extension) {
      return extension === 'jpeg' ? 'jpg' : extension
    }
  } catch {
    return null
  }

  return null
}

function getExtensionFromMimeType(mimeType: string) {
  switch (mimeType.split(';')[0].trim().toLowerCase()) {
    case 'image/jpeg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/gif':
      return 'gif'
    case 'image/webp':
      return 'webp'
    case 'image/tiff':
      return 'tif'
    default:
      return null
  }
}
