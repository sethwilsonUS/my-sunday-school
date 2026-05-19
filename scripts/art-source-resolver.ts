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
