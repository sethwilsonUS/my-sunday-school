// @vitest-environment node

import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import {
  candidateIsMateriallyBetter,
  chooseBestValidatedCandidate,
  extensionFromMimeType,
  normalizeCommonsFileTitle,
  resolveArtworkImage,
  type ImageDimensions,
  type ValidatedArtImageCandidate,
} from '../../scripts/art-source-resolver'

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
    ['image/gif', 'gif'],
    ['image/webp', 'webp'],
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
    const fetchFn = async (url: string) => {
      if (url.startsWith('https://commons.wikimedia.org/w/api.php')) {
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

      if (url === 'https://example.test/direct.jpg') {
        return new Response(direct, { headers: { 'content-type': 'image/jpeg' }, status: 200 })
      }

      if (url === 'https://upload.wikimedia.org/original.jpg') {
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
  })

  it('falls back to source-page og:image metadata when the source is not Commons', async () => {
    const image = await imageBuffer(1400, 1000)
    const fetchFn = async (url: string) => {
      if (url === 'https://museum.example/artwork') {
        return new Response('<meta property="og:image" content="https://museum.example/images/art.jpg">', {
          headers: { 'content-type': 'text/html' },
          status: 200,
        })
      }

      if (url === 'https://museum.example/images/art.jpg') {
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
  })
})
