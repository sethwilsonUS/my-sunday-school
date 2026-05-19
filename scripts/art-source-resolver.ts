import crypto from 'node:crypto'
import { lookup as dnsLookup } from 'node:dns/promises'
import { isIP } from 'node:net'

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
    case 'image/avif':
      return 'avif'
    case 'image/jpeg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/svg+xml':
      return 'svg'
    case 'image/gif':
      return 'gif'
    case 'image/heif':
      return 'heif'
    case 'image/heic':
      return 'heic'
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
  delayFn?: (ms: number) => Promise<void>
  fetchFn?: typeof fetch
  maxBytes?: number
  maxPixels?: number
  maxRetryDelayMs?: number
  maxSourcePageBytes?: number
  retryCount?: number
  retryDelayMs?: number
  resolveHostnameFn?: (hostname: string) => Promise<string[]>
  timeoutMs?: number
}

type CandidateHint = {
  reason: string
  url: string
}

const DEFAULT_MAX_IMAGE_BYTES = 60_000_000
const DEFAULT_MAX_IMAGE_PIXELS = 100_000_000
const DEFAULT_MAX_RETRY_DELAY_MS = 30000
const DEFAULT_MAX_SOURCE_PAGE_BYTES = 2_000_000
const DEFAULT_RETRY_DELAY_MS = 5000
const MAX_REDIRECTS = 5

export async function resolveArtworkImage(
  input: ArtworkResolverInput,
  options: ResolveArtworkImageOptions = {},
): Promise<ResolvedArtworkImage> {
  const fetchFn = options.fetchFn ?? fetch
  const failures: string[] = []
  const candidates = await collectCandidateHints(input, { ...options, fetchFn }, failures)
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

  const chosen = choosePreferredCandidate(validated)
  const providedImageUrl = input.imageUrl?.trim() || undefined

  if (!chosen) {
    throw new Error(`No usable image candidate found. ${failures.join('; ')}`.trim())
  }

  return {
    ...chosen,
    changedFromProvided: Boolean(providedImageUrl) && normalizeUrl(chosen.url) !== normalizeUrl(providedImageUrl),
    failures,
    providedImageUrl,
    sha256: crypto.createHash('sha256').update(chosen.buffer).digest('hex'),
  }
}

async function collectCandidateHints(
  input: ArtworkResolverInput,
  options: Required<Pick<ResolveArtworkImageOptions, 'fetchFn'>> & ResolveArtworkImageOptions,
  failures: string[],
) {
  const candidates: CandidateHint[] = []

  await addCandidate(candidates, input.imageUrl, 'provided image URL', options, failures)
  await addCandidate(candidates, input.alternateImageUrl, 'alternate image URL', options, failures)
  await addCandidate(candidates, getDirectImageUrl(input.sourceUrl ?? undefined), 'source image URL', options, failures)
  await addCandidate(
    candidates,
    getDirectImageUrl(input.alternateSourceUrl ?? undefined),
    'alternate source image URL',
    options,
    failures,
  )

  for (const sourceUrl of [input.sourceUrl, input.alternateSourceUrl, input.imageUrl, input.alternateImageUrl]) {
    const fileTitle = normalizeCommonsFileTitle(sourceUrl ?? undefined)

    if (fileTitle) {
      const commonsUrl = await fetchCommonsOriginal(fileTitle, options, failures)
      await addCandidate(candidates, commonsUrl, `Commons API original for ${fileTitle}`, options, failures)
    }
  }

  for (const sourceUrl of [input.sourceUrl, input.alternateSourceUrl]) {
    await addCandidate(
      candidates,
      getWgaImageUrl(sourceUrl ?? undefined),
      `WGA artwork image for ${sourceUrl}`,
      options,
      failures,
    )

    const metadataImage = await fetchSourcePageImage(sourceUrl ?? undefined, options, failures)
    await addCandidate(candidates, metadataImage, `source-page metadata for ${sourceUrl}`, options, failures)
  }

  return candidates
}

async function addCandidate(
  candidates: CandidateHint[],
  url: string | null | undefined,
  reason: string,
  options: Required<Pick<ResolveArtworkImageOptions, 'fetchFn'>> & ResolveArtworkImageOptions,
  failures: string[],
) {
  const normalized = url?.trim()

  if (!normalized) {
    return
  }

  const validatedUrl = await validateExternalHttpUrl(normalized, options).catch((error: unknown) => {
    failures.push(`${normalized}: ${error instanceof Error ? error.message : String(error)}`)
    return undefined
  })

  if (validatedUrl) {
    candidates.push({ reason, url: validatedUrl })
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

function choosePreferredCandidate(candidates: ValidatedArtImageCandidate[]) {
  const primaryCandidates = candidates.filter((candidate) => !candidate.reason.startsWith('source-page metadata'))

  return chooseBestValidatedCandidate(primaryCandidates.length > 0 ? primaryCandidates : candidates)
}

function getDirectImageUrl(value: string | undefined) {
  if (!value) {
    return undefined
  }

  if (normalizeCommonsFileTitle(value)) {
    return undefined
  }

  try {
    const url = new URL(value)

    if (!/^https?:$/i.test(url.protocol)) {
      return undefined
    }

    if (url.pathname.startsWith('/wiki/')) {
      return undefined
    }

    return /\.(?:avif|jpe?g|png|gif|svg|webp|heic|heif|tiff?)$/i.test(url.pathname) ? url.toString() : undefined
  } catch {
    return undefined
  }
}

function getWgaImageUrl(sourceUrl: string | undefined) {
  if (!sourceUrl) {
    return undefined
  }

  try {
    const url = new URL(sourceUrl)

    if (url.hostname.toLowerCase() !== 'www.wga.hu') {
      return undefined
    }

    if (!url.pathname.endsWith('.html')) {
      return undefined
    }

    const imagePath = url.pathname
      .replace(/^\/html_m\//, '/art/')
      .replace(/^\/html\//, '/art/')

    if (imagePath === url.pathname) {
      return undefined
    }

    url.pathname = imagePath.replace(/\.html$/, '.jpg')
    url.search = ''
    url.hash = ''
    return url.toString()
  } catch {
    return undefined
  }
}

async function fetchCommonsOriginal(
  fileTitle: string,
  options: Required<Pick<ResolveArtworkImageOptions, 'fetchFn'>> & ResolveArtworkImageOptions,
  failures: string[],
) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    iiprop: 'url|size|mime|sha1',
    prop: 'imageinfo',
    titles: `File:${fileTitle}`,
  })
  const url = `https://commons.wikimedia.org/w/api.php?${params.toString()}`
  const response = await fetchWithResolverHeaders(url, options).catch((error: unknown) => {
    failures.push(`${url}: ${error instanceof Error ? error.message : String(error)}`)
    return null
  })

  if (!response?.ok) {
    if (response) {
      failures.push(`${url}: ${response.status} ${response.statusText}`)
    }
    return undefined
  }

  const data = (await response.json().catch((error: unknown) => {
    failures.push(`${url}: Commons JSON parse failed: ${error instanceof Error ? error.message : String(error)}`)
    return null
  })) as unknown

  if (!isRecord(data) || !isRecord(data.query) || !isRecord(data.query.pages)) {
    failures.push(`${url}: Commons response did not include query.pages`)
    return undefined
  }

  for (const page of Object.values(data.query.pages)) {
    const failureContext = `${url}: Commons imageinfo for ${fileTitle}`

    if (!isRecord(page)) {
      failures.push(`${failureContext} had a malformed page entry`)
      continue
    }

    if (!Array.isArray(page.imageinfo)) {
      failures.push(`${failureContext} did not include imageinfo`)
      continue
    }

    if (!isRecord(page.imageinfo[0])) {
      failures.push(`${failureContext} did not include a usable imageinfo entry`)
      continue
    }

    const imageUrl = stringValue(page.imageinfo[0].url)
    const mime = stringValue(page.imageinfo[0].mime)

    if (!imageUrl) {
      failures.push(`${failureContext} did not include an image URL`)
      continue
    }

    if (!mime) {
      failures.push(`${failureContext} did not include an image MIME type`)
      continue
    }

    if (imageUrl && mime?.startsWith('image/')) {
      return await validateExternalHttpUrl(imageUrl, options).catch((error: unknown) => {
        failures.push(
          `${failureContext} returned an unsafe image URL: ${error instanceof Error ? error.message : String(error)}`,
        )
        return undefined
      })
    }

    failures.push(`${failureContext} returned non-image MIME ${mime}`)
  }

  return undefined
}

async function fetchSourcePageImage(
  sourceUrl: string | undefined,
  options: Required<Pick<ResolveArtworkImageOptions, 'fetchFn'>> & ResolveArtworkImageOptions,
  failures: string[],
) {
  if (!sourceUrl || normalizeCommonsFileTitle(sourceUrl)) {
    return undefined
  }

  const response = await fetchWithResolverHeaders(sourceUrl, options).catch((error: unknown) => {
    failures.push(`${sourceUrl}: ${error instanceof Error ? error.message : String(error)}`)
    return null
  })

  if (!response?.ok || !response.headers.get('content-type')?.toLowerCase().includes('text/html')) {
    return undefined
  }

  const html = await readResponseText(
    response,
    options.maxSourcePageBytes ?? DEFAULT_MAX_SOURCE_PAGE_BYTES,
    'source page',
  ).catch((error: unknown) => {
    failures.push(`${sourceUrl}: source page read failed: ${error instanceof Error ? error.message : String(error)}`)
    return undefined
  })

  if (!html) {
    return undefined
  }

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

  try {
    const metadataUrl = new URL(decodeHtmlEntities(raw), sourceUrl).toString()
    return await validateExternalHttpUrl(metadataUrl, options)
  } catch (error: unknown) {
    failures.push(`${sourceUrl}: invalid source-page metadata URL: ${error instanceof Error ? error.message : String(error)}`)
    return undefined
  }
}

async function validateCandidate(
  candidate: CandidateHint,
  options: Required<Pick<ResolveArtworkImageOptions, 'fetchFn'>> & ResolveArtworkImageOptions,
): Promise<ValidatedArtImageCandidate> {
  const response = await fetchWithResolverHeaders(candidate.url, options)

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`)
  }

  const headerMimeType = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase()

  if (headerMimeType && !headerMimeType.startsWith('image/') && headerMimeType !== 'application/octet-stream') {
    throw new Error(`expected image/* but got ${headerMimeType}`)
  }

  const buffer = await readResponseBuffer(response, options.maxBytes ?? DEFAULT_MAX_IMAGE_BYTES)
  const metadata = await sharp(buffer, { limitInputPixels: options.maxPixels ?? DEFAULT_MAX_IMAGE_PIXELS }).metadata()
  const mimeType = mimeTypeFromSharpMetadata(metadata.format, metadata.compression) ?? headerMimeType ?? 'image/jpeg'

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

async function fetchWithResolverHeaders(
  url: string,
  options: Required<Pick<ResolveArtworkImageOptions, 'fetchFn'>> & ResolveArtworkImageOptions,
) {
  const retryCount = options.retryCount ?? 0
  let attempt = 0

  while (true) {
    try {
      const response = await fetchExternalHttpUrl(url, options)

      if (!isRetryableStatus(response.status) || attempt >= retryCount) {
        return response
      }

      await response.body?.cancel().catch(() => undefined)
      await waitForRetry(response, attempt, options)
      attempt += 1
    } catch (error) {
      if (attempt >= retryCount) {
        throw error
      }

      await waitForRetry(undefined, attempt, options)
      attempt += 1
    }
  }
}

async function fetchExternalHttpUrl(
  url: string,
  options: Required<Pick<ResolveArtworkImageOptions, 'fetchFn'>> & ResolveArtworkImageOptions,
) {
  let currentUrl = await validateExternalHttpUrl(url, options)

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const response = await options.fetchFn(currentUrl, {
      headers: resolverHeaders(),
      redirect: 'manual',
      signal: AbortSignal.timeout(options.timeoutMs ?? 20000),
    })

    if (!isRedirectStatus(response.status)) {
      return response
    }

    const location = response.headers.get('location')

    if (!location) {
      return response
    }

    await response.body?.cancel().catch(() => undefined)

    if (redirectCount === MAX_REDIRECTS) {
      throw new Error(`too many redirects fetching ${url}`)
    }

    currentUrl = await validateExternalHttpUrl(new URL(location, currentUrl).toString(), options)
  }

  throw new Error(`too many redirects fetching ${url}`)
}

function isRedirectStatus(status: number) {
  return status >= 300 && status < 400
}

async function validateExternalHttpUrl(
  value: string,
  options: Required<Pick<ResolveArtworkImageOptions, 'fetchFn'>> & ResolveArtworkImageOptions,
) {
  let url: URL

  try {
    url = new URL(value.trim())
  } catch {
    throw new Error('invalid URL')
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('URL must use http or https')
  }

  const hostname = normalizeHostname(url.hostname)

  if (!hostname) {
    throw new Error('URL hostname is required')
  }

  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    throw new Error('localhost URLs are not allowed')
  }

  if (isIP(hostname)) {
    if (isInternalIpAddress(hostname)) {
      throw new Error(`internal network address is not allowed: ${hostname}`)
    }

    return url.toString()
  }

  const resolvedAddresses = await resolveHostnameAddresses(hostname, options)
  const internalAddress = resolvedAddresses.find((address) => isInternalIpAddress(address))

  if (internalAddress) {
    throw new Error(`hostname resolves to internal network address: ${internalAddress}`)
  }

  return url.toString()
}

async function resolveHostnameAddresses(
  hostname: string,
  options: Required<Pick<ResolveArtworkImageOptions, 'fetchFn'>> & ResolveArtworkImageOptions,
) {
  if (options.resolveHostnameFn) {
    return options.resolveHostnameFn(hostname)
  }

  const addresses = await dnsLookup(hostname, { all: true, verbatim: true })
  return addresses.map((address) => address.address)
}

function normalizeHostname(hostname: string) {
  return hostname
    .replace(/^\[(.*)\]$/, '$1')
    .replace(/\.$/, '')
    .toLowerCase()
}

function isInternalIpAddress(address: string) {
  const normalized = normalizeHostname(address)
  const mappedIpv4 = normalized.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/)?.[1]

  if (mappedIpv4) {
    return isInternalIpv4Address(mappedIpv4)
  }

  if (normalized.startsWith('::ffff:')) {
    return true
  }

  if (isIP(normalized) === 4) {
    return isInternalIpv4Address(normalized)
  }

  if (isIP(normalized) === 6) {
    return isInternalIpv6Address(normalized)
  }

  return false
}

function isInternalIpv4Address(address: string) {
  const [first, second] = address.split('.').map((part) => Number(part))

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    first >= 224
  )
}

function isInternalIpv6Address(address: string) {
  if (address === '::' || address === '::1') {
    return true
  }

  const firstSegment = address.split(':')[0]

  if (!firstSegment) {
    return false
  }

  const firstHextet = Number.parseInt(firstSegment, 16)

  return (firstHextet & 0xffc0) === 0xfe80 || (firstHextet & 0xfe00) === 0xfc00
}

async function waitForRetry(
  response: Response | undefined,
  attempt: number,
  options: ResolveArtworkImageOptions,
) {
  const retryAfterMs = response ? retryAfterHeaderMs(response.headers.get('retry-after')) : undefined
  const uncappedDelayMs = retryAfterMs ?? (options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS) * (attempt + 1)
  const delayMs = Math.min(uncappedDelayMs, options.maxRetryDelayMs ?? DEFAULT_MAX_RETRY_DELAY_MS)

  if (delayMs <= 0) {
    return
  }

  await (options.delayFn ?? delay)(delayMs)
}

function isRetryableStatus(status: number) {
  return status === 429 || status >= 500
}

function retryAfterHeaderMs(value: string | null) {
  if (!value) {
    return undefined
  }

  const seconds = Number(value)

  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000
  }

  const dateMs = Date.parse(value)

  if (!Number.isNaN(dateMs)) {
    return Math.max(0, dateMs - Date.now())
  }

  return undefined
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function readResponseBuffer(response: Response, maxBytes: number, label = 'image') {
  const contentLength = Number(response.headers.get('content-length'))

  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new Error(`${label} exceeds maximum size ${maxBytes.toLocaleString()} bytes`)
  }

  if (!response.body) {
    const buffer = Buffer.from(await response.arrayBuffer())

    if (buffer.length > maxBytes) {
      throw new Error(`${label} exceeds maximum size ${maxBytes.toLocaleString()} bytes`)
    }

    return buffer
  }

  const reader = response.body.getReader()
  const chunks: Buffer[] = []
  let receivedBytes = 0

  while (true) {
    const { done, value } = await reader.read()

    if (done) {
      break
    }

    if (!value) {
      continue
    }

    receivedBytes += value.byteLength

    if (receivedBytes > maxBytes) {
      await reader.cancel().catch(() => undefined)
      throw new Error(`${label} exceeds maximum size ${maxBytes.toLocaleString()} bytes`)
    }

    chunks.push(Buffer.from(value))
  }

  return Buffer.concat(chunks, receivedBytes)
}

async function readResponseText(response: Response, maxBytes: number, label: string) {
  return (await readResponseBuffer(response, maxBytes, label)).toString('utf8')
}

function mimeTypeFromSharpMetadata(format: string | undefined, compression: string | undefined) {
  switch (format) {
    case 'gif':
      return 'image/gif'
    case 'heif':
      return compression === 'av1' ? 'image/avif' : 'image/heif'
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'svg':
      return 'image/svg+xml'
    case 'tiff':
      return 'image/tiff'
    case 'webp':
      return 'image/webp'
    default:
      return undefined
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
