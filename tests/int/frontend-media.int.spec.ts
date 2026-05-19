// @vitest-environment node

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { getMediaImageSource } from '../../src/lib/frontend'
import type { Media } from '../../src/payload-types'

const media = (overrides: Partial<Media> = {}): Media => ({
  altText: 'Pentecost fresco',
  createdAt: '2026-05-19T00:00:00.000Z',
  height: 929,
  id: 123,
  updatedAt: '2026-05-19T00:00:00.000Z',
  url: '/api/media/file/original.jpg',
  width: 1000,
  sizes: {
    card: {
      height: 595,
      url: '/api/media/file/card.jpg',
      width: 640,
    },
    large: {
      height: 929,
      url: '/api/media/file/large.jpg',
      width: 1000,
    },
  },
  ...overrides,
})

describe('frontend media image selection', () => {
  it('can prefer the uploaded original for lightbox images', () => {
    expect(getMediaImageSource(media(), ['original', 'large', 'card'])).toEqual({
      height: 929,
      src: '/api/media/file/original.jpg',
      width: 1000,
    })
  })
})

describe('artwork lightbox layout styles', () => {
  const css = readFileSync('src/app/(frontend)/styles.css', 'utf8')

  const cssBlock = (selector: string) => {
    const match = css.match(new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{(?<body>[^}]*)\\}`))

    return match?.groups?.body ?? ''
  }

  it('uses a fixed viewport dialog so art can fill the available screen', () => {
    const dialog = cssBlock('.artwork-lightbox')
    const frame = cssBlock('.artwork-lightbox__frame')
    const shell = cssBlock('.artwork-lightbox__image-shell')
    const image = cssBlock('.artwork-lightbox__image')

    expect(dialog).toMatch(/(?:^|\n)\s*position: fixed;/)
    expect(dialog).toMatch(/(?:^|\n)\s*inset: 0;/)
    expect(dialog).toMatch(/(?:^|\n)\s*width: 100vw;/)
    expect(dialog).toMatch(/(?:^|\n)\s*height: 100dvh;/)
    expect(dialog).toMatch(/(?:^|\n)\s*max-width: none;/)
    expect(dialog).toMatch(/(?:^|\n)\s*max-height: none;/)
    expect(frame).toMatch(/(?:^|\n)\s*width: 100%;/)
    expect(frame).toMatch(/(?:^|\n)\s*height: 100%;/)
    expect(shell).toMatch(/(?:^|\n)\s*position: absolute;/)
    expect(shell).toMatch(/(?:^|\n)\s*inset: 0;/)
    expect(shell).toMatch(/(?:^|\n)\s*width: 100%;/)
    expect(shell).toMatch(/(?:^|\n)\s*height: 100%;/)
    expect(image).toMatch(/(?:^|\n)\s*width: 100%;/)
    expect(image).toMatch(/(?:^|\n)\s*height: 100%;/)
    expect(image).toMatch(/(?:^|\n)\s*object-fit: contain;/)
    expect(shell).not.toContain('1200px')
    expect(image).not.toContain('1200px')
  })
})
