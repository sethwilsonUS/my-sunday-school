// @vitest-environment node

import { describe, expect, it } from 'vitest'

import {
  candidateIsMateriallyBetter,
  chooseBestValidatedCandidate,
  normalizeCommonsFileTitle,
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

  it('chooses the candidate with the largest pixel area, then filesize', () => {
    const chosen = chooseBestValidatedCandidate([
      candidate('https://example.test/small.jpg', { width: 700, height: 900 }, 800_000),
      candidate('https://example.test/better.jpg', { width: 1600, height: 1200 }, 300_000),
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
})
