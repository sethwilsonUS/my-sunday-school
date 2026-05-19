// @vitest-environment node

import { lookup as dnsLookup } from 'node:dns/promises'

import sharp from 'sharp'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  candidateIsMateriallyBetter,
  chooseBestValidatedCandidate,
  extensionFromMimeType,
  normalizeCommonsFileTitle,
  resolveArtworkImage,
  type ImageDimensions,
  type ValidatedArtImageCandidate,
} from '../../scripts/art-source-resolver'

vi.mock('node:dns/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:dns/promises')>()

  return {
    ...actual,
    lookup: vi.fn(actual.lookup),
  }
})

const candidate = (
  url: string,
  dimensions: ImageDimensions,
  contentLength = dimensions.width * dimensions.height,
): ValidatedArtImageCandidate => ({
  buffer: Buffer.from('candidate'),
  contentLength,
  dimensions,
  mimeType: 'image/jpeg',
  reason: 'test',
  url,
})

const imageBuffer = (width: number, height: number) =>
  sharp({
    create: {
      background: '#ffffff',
      channels: 3,
      height,
      width,
    },
  })
    .jpeg()
    .toBuffer()

const fetchUrl = (url: Parameters<typeof fetch>[0]) =>
  typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url

beforeEach(() => {
  vi.mocked(dnsLookup).mockReset()
  vi.mocked(dnsLookup).mockResolvedValue([{ address: '203.0.113.10', family: 4 }])
})

describe('art source resolver', () => {
  it('normalizes Commons file page and Special:Redirect URLs to file titles', () => {
    expect(
      normalizeCommonsFileTitle(
        'https://commons.wikimedia.org/wiki/File:El_Greco_-_The_Pentecost_-_WGA10533.jpg',
      ),
    ).toBe('El Greco - The Pentecost - WGA10533.jpg')

    expect(
      normalizeCommonsFileTitle(
        'https://commons.wikimedia.org/wiki/Special:Redirect/file/El%20Greco%20-%20The%20Pentecost%20-%20WGA10533.jpg',
      ),
    ).toBe('El Greco - The Pentecost - WGA10533.jpg')
  })

  it('does not normalize non-Commons wiki file URLs as Commons titles', () => {
    expect(normalizeCommonsFileTitle('https://museum.example/wiki/File:Collection_Image.jpg')).toBeUndefined()
    expect(
      normalizeCommonsFileTitle('https://museum.example/wiki/Special:Redirect/file/Collection%20Image.jpg'),
    ).toBeUndefined()
  })

  it('chooses the candidate with the largest pixel area first', () => {
    const chosen = chooseBestValidatedCandidate([
      candidate('https://example.test/small.jpg', { width: 700, height: 900 }, 800_000),
      candidate('https://example.test/better.jpg', { width: 1600, height: 1200 }, 300_000),
      candidate('https://example.test/big-file-smaller-area.jpg', { width: 1000, height: 1000 }, 900_000),
    ])

    expect(chosen?.url).toBe('https://example.test/better.jpg')
  })

  it('chooses the longer longest dimension when pixel area is equal', () => {
    const chosen = chooseBestValidatedCandidate([
      candidate('https://example.test/bigger-file-shorter-longest.jpg', { width: 1000, height: 1000 }, 900_000),
      candidate('https://example.test/smaller-file-longer-longest.jpg', { width: 2000, height: 500 }, 300_000),
    ])

    expect(chosen?.url).toBe('https://example.test/smaller-file-longer-longest.jpg')
  })

  it('chooses the larger filesize when pixel area and longest dimension are equal', () => {
    const chosen = chooseBestValidatedCandidate([
      candidate('https://example.test/equal-area-smaller-file.jpg', { width: 1600, height: 1200 }, 300_000),
      candidate('https://example.test/equal-area-bigger-file.jpg', { width: 1200, height: 1600 }, 900_000),
    ])

    expect(chosen?.url).toBe('https://example.test/equal-area-bigger-file.jpg')
  })

  it('requires a candidate to be materially better before refresh', () => {
    expect(
      candidateIsMateriallyBetter(
        { width: 700, height: 900 },
        { width: 1280, height: 1646 },
      ),
    ).toBe(true)

    expect(
      candidateIsMateriallyBetter(
        { width: 1200, height: 1000 },
        { width: 1300, height: 1030 },
      ),
    ).toBe(false)

    expect(
      candidateIsMateriallyBetter(
        { width: 1600, height: 1200 },
        { width: 1280, height: 960 },
      ),
    ).toBe(false)
  })

  it.each([
    ['image/jpeg', 'jpg'],
    ['image/png', 'png'],
    ['image/avif', 'avif'],
    ['image/gif', 'gif'],
    ['image/heif', 'heif'],
    ['image/heic', 'heic'],
    ['image/webp', 'webp'],
    ['image/svg+xml', 'svg'],
    ['image/tiff', 'tif'],
    ['IMAGE/JPEG; charset=binary', 'jpg'],
    ['application/x-custom.png', 'jpg'],
  ])('maps %s to the %s extension', (mimeType, extension) => {
    expect(extensionFromMimeType(mimeType)).toBe(extension)
  })
})

describe('art source resolver network resolution', () => {
  it('uses Commons API imageinfo when a Commons source page is provided', async () => {
    const original = await imageBuffer(1600, 1200)
    const direct = await imageBuffer(700, 900)
    let commonsRequestHadSignal = false
    const fetchFn: typeof fetch = async (url, init) => {
      const href = fetchUrl(url)

      if (href.startsWith('https://commons.wikimedia.org/w/api.php')) {
        commonsRequestHadSignal = Boolean(init?.signal)
        return new Response(
          JSON.stringify({
            query: {
              pages: {
                '123': {
                  imageinfo: [
                    {
                      height: 1200,
                      mime: 'image/jpeg',
                      size: original.length,
                      url: 'https://upload.wikimedia.org/original.jpg',
                      width: 1600,
                    },
                  ],
                },
              },
            },
          }),
          { headers: { 'content-type': 'application/json' }, status: 200 },
        )
      }

      if (href === 'https://example.test/direct.jpg') {
        return new Response(direct, { headers: { 'content-type': 'image/jpeg' }, status: 200 })
      }

      if (href === 'https://upload.wikimedia.org/original.jpg') {
        return new Response(original, { headers: { 'content-type': 'image/jpeg' }, status: 200 })
      }

      return new Response('missing', { status: 404 })
    }

    const resolved = await resolveArtworkImage(
      {
        artist: 'El Greco',
        imageUrl: 'https://example.test/direct.jpg',
        sourceUrl: 'https://commons.wikimedia.org/wiki/File:El_Greco_-_The_Pentecost_-_WGA10533.jpg',
        title: 'The Pentecost',
      },
      { fetchFn },
    )

    expect(resolved.url).toBe('https://upload.wikimedia.org/original.jpg')
    expect(resolved.dimensions).toEqual({ width: 1600, height: 1200 })
    expect(resolved.providedImageUrl).toBe('https://example.test/direct.jpg')
    expect(resolved.changedFromProvided).toBe(true)
    expect(commonsRequestHadSignal).toBe(true)
  })

  it('falls back to source-page og:image metadata when the source is not Commons', async () => {
    const image = await imageBuffer(1400, 1000)
    const fetchFn: typeof fetch = async (url) => {
      const href = fetchUrl(url)

      if (href === 'https://museum.example/artwork') {
        return new Response('<meta property="og:image" content="/images/art.jpg">', {
          headers: { 'content-type': 'text/html' },
          status: 200,
        })
      }

      if (href === 'https://museum.example/images/art.jpg') {
        return new Response(image, { headers: { 'content-type': 'image/jpeg' }, status: 200 })
      }

      return new Response('missing', { status: 404 })
    }

    const resolved = await resolveArtworkImage(
      {
        artist: 'Museum Artist',
        imageUrl: '',
        sourceUrl: 'https://museum.example/artwork',
        title: 'Museum Work',
      },
      { fetchFn },
    )

    expect(resolved.url).toBe('https://museum.example/images/art.jpg')
    expect(resolved.dimensions).toEqual({ width: 1400, height: 1000 })
    expect(resolved.changedFromProvided).toBe(false)
    expect(resolved.sha256).toMatch(/^[a-f0-9]{64}$/)
  })

  it('keeps valid direct candidates ahead of larger source-page metadata candidates', async () => {
    const direct = await imageBuffer(800, 800)
    const metadata = await imageBuffer(2400, 2400)
    const fetchFn: typeof fetch = async (url) => {
      const href = fetchUrl(url)

      if (href === 'https://museum.example/artwork') {
        return new Response('<meta property="og:image" content="/social-card.jpg">', {
          headers: { 'content-type': 'text/html' },
          status: 200,
        })
      }

      if (href === 'https://example.test/direct.jpg') {
        return new Response(direct, { headers: { 'content-type': 'image/jpeg' }, status: 200 })
      }

      if (href === 'https://museum.example/social-card.jpg') {
        return new Response(metadata, { headers: { 'content-type': 'image/jpeg' }, status: 200 })
      }

      return new Response('missing', { status: 404 })
    }

    const resolved = await resolveArtworkImage(
      {
        imageUrl: 'https://example.test/direct.jpg',
        sourceUrl: 'https://museum.example/artwork',
        title: 'Museum Work',
      },
      { fetchFn },
    )

    expect(resolved.url).toBe('https://example.test/direct.jpg')
  })

  it('rejects oversized image candidates before buffering them', async () => {
    const fetchFn: typeof fetch = async () =>
      new Response('oversized', {
        headers: {
          'content-length': '100',
          'content-type': 'image/jpeg',
        },
        status: 200,
      })

    await expect(
      resolveArtworkImage(
        {
          imageUrl: 'https://example.test/oversized.jpg',
        },
        { fetchFn, maxBytes: 10 },
      ),
    ).rejects.toThrow('image exceeds maximum size 10 bytes')
  })

  it('retries retryable candidate responses before giving up', async () => {
    const image = await imageBuffer(1200, 800)
    const retryDelays: number[] = []
    let attempts = 0
    const fetchFn: typeof fetch = async () => {
      attempts += 1

      if (attempts < 3) {
        return new Response('rate limited', {
          status: 429,
          statusText: 'Too Many Requests',
        })
      }

      return new Response(image, {
        headers: { 'content-type': 'image/jpeg' },
        status: 200,
      })
    }

    const resolved = await resolveArtworkImage(
      {
        imageUrl: 'https://example.test/original.jpg',
      },
      {
        delayFn: async (ms) => {
          retryDelays.push(ms)
        },
        fetchFn,
        retryCount: 2,
        retryDelayMs: 25,
      },
    )

    expect(attempts).toBe(3)
    expect(retryDelays).toEqual([25, 50])
    expect(resolved.dimensions).toEqual({ width: 1200, height: 800 })
  })

  it('caps retry-after delays from retryable responses', async () => {
    const image = await imageBuffer(1200, 800)
    const retryDelays: number[] = []
    let attempts = 0
    const fetchFn: typeof fetch = async () => {
      attempts += 1

      if (attempts === 1) {
        return new Response('rate limited', {
          headers: { 'retry-after': '120' },
          status: 429,
          statusText: 'Too Many Requests',
        })
      }

      return new Response(image, {
        headers: { 'content-type': 'image/jpeg' },
        status: 200,
      })
    }

    const resolved = await resolveArtworkImage(
      {
        imageUrl: 'https://example.test/original.jpg',
      },
      {
        delayFn: async (ms) => {
          retryDelays.push(ms)
        },
        fetchFn,
        maxRetryDelayMs: 250,
        retryCount: 1,
        retryDelayMs: 25,
      },
    )

    expect(attempts).toBe(2)
    expect(retryDelays).toEqual([250])
    expect(resolved.dimensions).toEqual({ width: 1200, height: 800 })
  })

  it('caps source-page HTML reads and still validates direct candidates', async () => {
    const image = await imageBuffer(1300, 900)
    const fetchFn: typeof fetch = async (url) => {
      const href = fetchUrl(url)

      if (href === 'https://museum.example/huge-artwork-page') {
        return new Response('too much html', {
          headers: {
            'content-length': '100',
            'content-type': 'text/html',
          },
          status: 200,
        })
      }

      if (href === 'https://example.test/provided.jpg') {
        return new Response(image, { headers: { 'content-type': 'image/jpeg' }, status: 200 })
      }

      return new Response('missing', { status: 404 })
    }

    const resolved = await resolveArtworkImage(
      {
        imageUrl: 'https://example.test/provided.jpg',
        sourceUrl: 'https://museum.example/huge-artwork-page',
      },
      { fetchFn, maxSourcePageBytes: 10 },
    )

    expect(resolved.url).toBe('https://example.test/provided.jpg')
    expect(resolved.failures.some((failure) => failure.includes('source page exceeds maximum size 10 bytes'))).toBe(
      true,
    )
  })

  it('canonicalizes MIME type from decoded image metadata', async () => {
    const png = await sharp({
      create: {
        background: '#ffffff',
        channels: 3,
        height: 100,
        width: 200,
      },
    })
      .png()
      .toBuffer()
    const avif = await sharp({
      create: {
        background: '#ffffff',
        channels: 3,
        height: 120,
        width: 240,
      },
    })
      .avif()
      .toBuffer()
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" />'
    const fetchFn: typeof fetch = async (url) => {
      const href = fetchUrl(url)

      if (href === 'https://example.test/misleading.jpg') {
        return new Response(png, { headers: { 'content-type': 'image/jpeg' }, status: 200 })
      }

      if (href === 'https://example.test/extensionless') {
        return new Response(avif, { headers: { 'content-type': 'application/octet-stream' }, status: 200 })
      }

      if (href === 'https://example.test/misleading.svg') {
        return new Response(svg, { headers: { 'content-type': 'image/jpeg' }, status: 200 })
      }

      return new Response('missing', { status: 404 })
    }

    const pngResolved = await resolveArtworkImage({ imageUrl: 'https://example.test/misleading.jpg' }, { fetchFn })
    const avifResolved = await resolveArtworkImage({ imageUrl: 'https://example.test/extensionless' }, { fetchFn })
    const svgResolved = await resolveArtworkImage({ sourceUrl: 'https://example.test/misleading.svg' }, { fetchFn })

    expect(pngResolved.mimeType).toBe('image/png')
    expect(avifResolved.mimeType).toBe('image/avif')
    expect(svgResolved.mimeType).toBe('image/svg+xml')
  })

  it('derives WGA artwork image URLs from WGA source pages', async () => {
    const image = await imageBuffer(1028, 1200)
    const fetchFn: typeof fetch = async (url) => {
      const href = fetchUrl(url)

      if (href === 'https://www.wga.hu/art/d/duccio/maesta/crown_v/cro_v_1a.jpg') {
        return new Response(image, { headers: { 'content-type': 'image/jpeg' }, status: 200 })
      }

      return new Response('missing', { status: 404 })
    }

    const resolved = await resolveArtworkImage(
      {
        sourceUrl: 'https://www.wga.hu/html_m/d/duccio/maesta/crown_v/cro_v_1a.html',
        title: 'Appearance Behind Locked Doors',
      },
      { fetchFn },
    )

    expect(resolved.url).toBe('https://www.wga.hu/art/d/duccio/maesta/crown_v/cro_v_1a.jpg')
    expect(resolved.dimensions).toEqual({ width: 1028, height: 1200 })
    expect(resolved.changedFromProvided).toBe(false)
  })

  it('uses direct image source URLs as candidates', async () => {
    const image = await imageBuffer(2136, 2848)
    const fetchFn: typeof fetch = async (url) => {
      const href = fetchUrl(url)

      if (href === 'https://upload.wikimedia.org/wikipedia/commons/8/84/Chartres_JBU01.JPG') {
        return new Response(image, { headers: { 'content-type': 'image/jpeg' }, status: 200 })
      }

      return new Response('missing', { status: 404 })
    }

    const resolved = await resolveArtworkImage(
      {
        sourceUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/84/Chartres_JBU01.JPG',
        title: 'Chartres Cathedral',
      },
      { fetchFn },
    )

    expect(resolved.url).toBe('https://upload.wikimedia.org/wikipedia/commons/8/84/Chartres_JBU01.JPG')
    expect(resolved.dimensions).toEqual({ width: 2136, height: 2848 })
  })

  it('uses direct AVIF, HEIC, HEIF, and SVG source URLs as candidates', async () => {
    const avif = await imageBuffer(300, 300)
    const heic = await imageBuffer(400, 500)
    const heif = await imageBuffer(500, 400)
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" />'
    const fetchFn: typeof fetch = async (url) => {
      const href = fetchUrl(url)

      if (href === 'https://example.test/source.avif') {
        return new Response(avif, { headers: { 'content-type': 'image/avif' }, status: 200 })
      }

      if (href === 'https://example.test/source.heic') {
        return new Response(heic, { headers: { 'content-type': 'image/jpeg' }, status: 200 })
      }

      if (href === 'https://example.test/source.heif') {
        return new Response(heif, { headers: { 'content-type': 'image/jpeg' }, status: 200 })
      }

      if (href === 'https://example.test/source.svg') {
        return new Response(svg, { headers: { 'content-type': 'image/svg+xml' }, status: 200 })
      }

      return new Response('missing', { status: 404 })
    }

    const avifResolved = await resolveArtworkImage({ sourceUrl: 'https://example.test/source.avif' }, { fetchFn })
    const heicResolved = await resolveArtworkImage({ sourceUrl: 'https://example.test/source.heic' }, { fetchFn })
    const heifResolved = await resolveArtworkImage({ sourceUrl: 'https://example.test/source.heif' }, { fetchFn })
    const svgResolved = await resolveArtworkImage({ sourceUrl: 'https://example.test/source.svg' }, { fetchFn })

    expect(avifResolved.url).toBe('https://example.test/source.avif')
    expect(heicResolved.url).toBe('https://example.test/source.heic')
    expect(heifResolved.url).toBe('https://example.test/source.heif')
    expect(svgResolved.url).toBe('https://example.test/source.svg')
    expect(svgResolved.dimensions).toEqual({ width: 200, height: 100 })
  })

  it('rejects internal literal image URLs before fetching', async () => {
    const fetchedUrls: string[] = []
    const fetchFn: typeof fetch = async (url) => {
      fetchedUrls.push(fetchUrl(url))
      return new Response('should not fetch', { status: 200 })
    }

    await expect(
      resolveArtworkImage(
        {
          imageUrl: 'http://127.0.0.1/private.jpg',
        },
        { fetchFn },
      ),
    ).rejects.toThrow('No usable image candidate found')

    expect(fetchedUrls).toEqual([])
  })

  it('resolves hostnames before fetching through a custom fetch function', async () => {
    vi.mocked(dnsLookup).mockResolvedValueOnce([{ address: '127.0.0.1', family: 4 }])

    const fetchedUrls: string[] = []
    const fetchFn: typeof fetch = async (url) => {
      fetchedUrls.push(fetchUrl(url))
      return new Response('should not fetch', { status: 200 })
    }

    await expect(
      resolveArtworkImage(
        {
          imageUrl: 'https://public.example/private.jpg',
        },
        { fetchFn },
      ),
    ).rejects.toThrow('No usable image candidate found')

    expect(fetchedUrls).toEqual([])
    expect(dnsLookup).toHaveBeenCalledWith('public.example', { all: true, verbatim: true })
  })

  it('rejects redirects to internal network addresses', async () => {
    const fetchedUrls: string[] = []
    const fetchFn: typeof fetch = async (url) => {
      const href = fetchUrl(url)
      fetchedUrls.push(href)

      if (href === 'https://public.example/original.jpg') {
        return new Response(null, {
          headers: { location: 'http://169.254.169.254/latest/meta-data' },
          status: 302,
        })
      }

      return new Response('missing', { status: 404 })
    }

    await expect(
      resolveArtworkImage(
        {
          imageUrl: 'https://public.example/original.jpg',
        },
        {
          fetchFn,
          resolveHostnameFn: async () => ['203.0.113.10'],
        },
      ),
    ).rejects.toThrow('No usable image candidate found')

    expect(fetchedUrls).toEqual(['https://public.example/original.jpg'])
  })

  it('keeps validating provided images when source-page metadata has a bad URL', async () => {
    const image = await imageBuffer(1300, 900)
    const fetchFn: typeof fetch = async (url) => {
      const href = fetchUrl(url)

      if (href === 'https://museum.example/artwork') {
        return new Response('<meta property="og:image" content="https://[invalid">', {
          headers: { 'content-type': 'text/html' },
          status: 200,
        })
      }

      if (href === 'https://example.test/provided.jpg') {
        return new Response(image, { headers: { 'content-type': 'image/jpeg' }, status: 200 })
      }

      return new Response('missing', { status: 404 })
    }

    const resolved = await resolveArtworkImage(
      {
        imageUrl: 'https://example.test/provided.jpg',
        sourceUrl: 'https://museum.example/artwork',
        title: 'Museum Work',
      },
      { fetchFn },
    )

    expect(resolved.url).toBe('https://example.test/provided.jpg')
    expect(resolved.failures.some((failure) => failure.includes('https://museum.example/artwork'))).toBe(true)
  })

  it('records Commons JSON failures and still validates provided images', async () => {
    const image = await imageBuffer(1300, 900)
    const fetchFn: typeof fetch = async (url) => {
      const href = fetchUrl(url)

      if (href.startsWith('https://commons.wikimedia.org/w/api.php')) {
        return new Response('{not json', { headers: { 'content-type': 'application/json' }, status: 200 })
      }

      if (href === 'https://example.test/provided.jpg') {
        return new Response(image, { headers: { 'content-type': 'image/jpeg' }, status: 200 })
      }

      return new Response('missing', { status: 404 })
    }

    const resolved = await resolveArtworkImage(
      {
        imageUrl: 'https://example.test/provided.jpg',
        sourceUrl: 'https://commons.wikimedia.org/wiki/File:Broken_Metadata.jpg',
        title: 'Broken Metadata',
      },
      { fetchFn },
    )

    expect(resolved.url).toBe('https://example.test/provided.jpg')
    expect(resolved.failures.some((failure) => failure.includes('Commons JSON parse failed'))).toBe(true)
  })

  it('records Commons page imageinfo failures and still validates provided images', async () => {
    const image = await imageBuffer(1300, 900)
    const fetchFn: typeof fetch = async (url) => {
      const href = fetchUrl(url)

      if (href.startsWith('https://commons.wikimedia.org/w/api.php')) {
        return new Response(
          JSON.stringify({
            query: {
              pages: {
                '123': {
                  imageinfo: [
                    {
                      mime: 'text/html',
                      url: 'https://commons.wikimedia.org/wiki/File:Not_Image',
                    },
                  ],
                },
              },
            },
          }),
          { headers: { 'content-type': 'application/json' }, status: 200 },
        )
      }

      if (href === 'https://example.test/provided.jpg') {
        return new Response(image, { headers: { 'content-type': 'image/jpeg' }, status: 200 })
      }

      return new Response('missing', { status: 404 })
    }

    const resolved = await resolveArtworkImage(
      {
        imageUrl: 'https://example.test/provided.jpg',
        sourceUrl: 'https://commons.wikimedia.org/wiki/File:Malformed_Imageinfo.jpg',
        title: 'Malformed Imageinfo',
      },
      { fetchFn },
    )

    expect(resolved.url).toBe('https://example.test/provided.jpg')
    expect(
      resolved.failures.some(
        (failure) => failure.includes('Malformed Imageinfo.jpg') && failure.includes('non-image MIME'),
      ),
    ).toBe(true)
  })
})
