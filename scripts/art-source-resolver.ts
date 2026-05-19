import crypto from 'node:crypto'

import sharp from 'sharp'

export type ImageDimensions = {
  height: number
  width: number
}

export type ValidatedArtImageCandidate = {
  buffer: Buffer
  contentLength: number
  dimensions: ImageDimensions
  mimeType: string
  reason: string
  url: string
}

export function normalizeCommonsFileTitle(value: string | undefined) {
  if (!value?.trim()) {
    return undefined
  }

  try {
    const url = new URL(value.trim())

    if (url.hostname.toLowerCase() !== 'commons.wikimedia.org') {
      return undefined
    }

    const decodedPath = decodeURIComponent(url.pathname)
    const filePageMatch = decodedPath.match(/\/wiki\/File:(.+)$/)
    const redirectMatch = decodedPath.match(/\/wiki\/Special:Redirect\/file\/(.+)$/)
    const title = filePageMatch?.[1] ?? redirectMatch?.[1]

    if (!title) {
      return undefined
    }

    return title.replace(/_/g, ' ').trim()
  } catch {
    return undefined
  }
}

export function candidateIsMateriallyBetter(current: ImageDimensions | undefined, candidate: ImageDimensions) {
  if (!current?.width || !current.height) {
    return true
  }

  const currentArea = current.width * current.height
  const candidateArea = candidate.width * candidate.height
  const currentLongest = Math.max(current.width, current.height)
  const candidateLongest = Math.max(candidate.width, candidate.height)
  const candidateShortest = Math.min(candidate.width, candidate.height)

  if (candidateArea < currentArea) {
    return false
  }

  if (current.width < 1280 && current.height < 1280 && candidateShortest >= 1280) {
    return true
  }

  return candidateArea >= currentArea * 1.25 && candidateLongest >= currentLongest * 1.1
}

export function chooseBestValidatedCandidate(candidates: ValidatedArtImageCandidate[]) {
  return [...candidates].sort((left, right) => {
    const areaDelta = right.dimensions.width * right.dimensions.height - left.dimensions.width * left.dimensions.height

    if (areaDelta !== 0) {
      return areaDelta
    }

    const longestDelta =
      Math.max(right.dimensions.width, right.dimensions.height) -
      Math.max(left.dimensions.width, left.dimensions.height)

    if (longestDelta !== 0) {
      return longestDelta
    }

    return right.contentLength - left.contentLength
  })[0]
}

export function extensionFromMimeType(mimeType: string) {
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
      return 'jpg'
  }
}

export type ArtworkResolverInput = {
  alternateImageUrl?: string | null
  alternateSourceUrl?: string | null
  artist?: string | null
  imageUrl?: string | null
  sourceUrl?: string | null
  title?: string | null
  workDate?: string | null
}

export type ResolvedArtworkImage = ValidatedArtImageCandidate & {
  changedFromProvided: boolean
  failures: string[]
  providedImageUrl?: string
  sha256: string
}

export type ResolveArtworkImageOptions = {
  fetchFn?: typeof fetch
  timeoutMs?: number
}

type CandidateHint = {
  reason: string
  url: string
}

export async function resolveArtworkImage(
  input: ArtworkResolverInput,
  options: ResolveArtworkImageOptions = {},
): Promise<ResolvedArtworkImage> {
  const fetchFn = options.fetchFn ?? fetch
  const failures: string[] = []
  const candidates = await collectCandidateHints(input, fetchFn, failures)
  const validated: ValidatedArtImageCandidate[] = []

  for (const candidate of uniqueCandidateHints(candidates)) {
    const result = await validateCandidate(candidate, { ...options, fetchFn }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error)
      failures.push(`${candidate.url}: ${message}`)
      return null
    })

    if (result) {
      validated.push(result)
    }
  }

  const chosen = chooseBestValidatedCandidate(validated)

  if (!chosen) {
    throw new Error(`No usable image candidate found. ${failures.join('; ')}`.trim())
  }

  return {
    ...chosen,
    changedFromProvided: normalizeUrl(chosen.url) !== normalizeUrl(input.imageUrl ?? undefined),
    failures,
    providedImageUrl: input.imageUrl?.trim() || undefined,
    sha256: crypto.createHash('sha256').update(chosen.buffer).digest('hex'),
  }
}

async function collectCandidateHints(input: ArtworkResolverInput, fetchFn: typeof fetch, failures: string[]) {
  const candidates: CandidateHint[] = []

  addCandidate(candidates, input.imageUrl, 'provided image URL')
  addCandidate(candidates, input.alternateImageUrl, 'alternate image URL')

  for (const sourceUrl of [input.sourceUrl, input.alternateSourceUrl, input.imageUrl, input.alternateImageUrl]) {
    const fileTitle = normalizeCommonsFileTitle(sourceUrl ?? undefined)

    if (fileTitle) {
      const commonsUrl = await fetchCommonsOriginal(fileTitle, fetchFn, failures)
      addCandidate(candidates, commonsUrl, `Commons API original for ${fileTitle}`)
    }
  }

  for (const sourceUrl of [input.sourceUrl, input.alternateSourceUrl]) {
    const metadataImage = await fetchSourcePageImage(sourceUrl ?? undefined, fetchFn, failures)
    addCandidate(candidates, metadataImage, `source-page metadata for ${sourceUrl}`)
  }

  return candidates
}

function addCandidate(candidates: CandidateHint[], url: string | null | undefined, reason: string) {
  const normalized = url?.trim()

  if (normalized && /^https?:\/\//i.test(normalized)) {
    candidates.push({ reason, url: normalized })
  }
}

function uniqueCandidateHints(candidates: CandidateHint[]) {
  const seen = new Set<string>()

  return candidates.filter((candidate) => {
    const key = normalizeUrl(candidate.url)

    if (!key || seen.has(key)) {
      return false
    }

    seen.add(key)
    return true
  })
}

async function fetchCommonsOriginal(fileTitle: string, fetchFn: typeof fetch, failures: string[]) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    iiprop: 'url|size|mime|sha1',
    prop: 'imageinfo',
    titles: `File:${fileTitle}`,
  })
  const url = `https://commons.wikimedia.org/w/api.php?${params.toString()}`
  const response = await fetchFn(url, { headers: resolverHeaders() }).catch((error: unknown) => {
    failures.push(`${url}: ${error instanceof Error ? error.message : String(error)}`)
    return null
  })

  if (!response?.ok) {
    if (response) {
      failures.push(`${url}: ${response.status} ${response.statusText}`)
    }
    return undefined
  }

  const data = (await response.json().catch(() => null)) as unknown

  if (!isRecord(data) || !isRecord(data.query) || !isRecord(data.query.pages)) {
    return undefined
  }

  for (const page of Object.values(data.query.pages)) {
    if (!isRecord(page) || !Array.isArray(page.imageinfo) || !isRecord(page.imageinfo[0])) {
      continue
    }

    const imageUrl = stringValue(page.imageinfo[0].url)
    const mime = stringValue(page.imageinfo[0].mime)

    if (imageUrl && mime?.startsWith('image/')) {
      return imageUrl
    }
  }

  return undefined
}

async function fetchSourcePageImage(sourceUrl: string | undefined, fetchFn: typeof fetch, failures: string[]) {
  if (!sourceUrl || normalizeCommonsFileTitle(sourceUrl)) {
    return undefined
  }

  const response = await fetchFn(sourceUrl, { headers: resolverHeaders() }).catch((error: unknown) => {
    failures.push(`${sourceUrl}: ${error instanceof Error ? error.message : String(error)}`)
    return null
  })

  if (!response?.ok || !response.headers.get('content-type')?.includes('text/html')) {
    return undefined
  }

  const html = await response.text()
  const match =
    html.match(
      /<meta[^>]+(?:property|name|itemprop)=["'](?:og:image|twitter:image|thumbnail|image)["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    ) ??
    html.match(
      /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name|itemprop)=["'](?:og:image|twitter:image|thumbnail|image)["'][^>]*>/i,
    ) ??
    html.match(/"(?:thumbnailUrl|contentUrl|image)"\s*:\s*(?:"([^"]+)"|\[\s*"([^"]+)")/i)
  const raw = match?.[1] ?? match?.[2]

  if (!raw) {
    return undefined
  }

  return new URL(decodeHtmlEntities(raw), sourceUrl).toString()
}

async function validateCandidate(
  candidate: CandidateHint,
  options: Required<Pick<ResolveArtworkImageOptions, 'fetchFn'>> & ResolveArtworkImageOptions,
): Promise<ValidatedArtImageCandidate> {
  const response = await options.fetchFn(candidate.url, {
    headers: resolverHeaders(),
    signal: AbortSignal.timeout(options.timeoutMs ?? 20000),
  })

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`)
  }

  const mimeType = response.headers.get('content-type')?.split(';')[0]?.trim() || 'application/octet-stream'

  if (!mimeType.startsWith('image/')) {
    throw new Error(`expected image/* but got ${mimeType}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  const metadata = await sharp(buffer).metadata()

  if (!metadata.width || !metadata.height) {
    throw new Error('image dimensions could not be read')
  }

  return {
    buffer,
    contentLength: buffer.length,
    dimensions: { height: metadata.height, width: metadata.width },
    mimeType,
    reason: candidate.reason,
    url: candidate.url,
  }
}

function resolverHeaders() {
  return {
    accept: 'image/avif,image/webp,image/png,image/jpeg,image/*;q=0.9,text/html,application/json;q=0.8,*/*;q=0.5',
    'user-agent': 'my-sunday-school-art-source-resolver/1.0',
  }
}

function normalizeUrl(value: string | undefined) {
  if (!value) {
    return undefined
  }

  try {
    const url = new URL(value)
    url.hash = ''
    return url.toString()
  } catch {
    return value.trim()
  }
}

function decodeHtmlEntities(value: string) {
  return value.replace(/&amp;/g, '&').replace(/&#x2F;/gi, '/').replace(/&#47;/g, '/').trim()
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}
