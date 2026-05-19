// @vitest-environment node

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('lesson art attachment script wiring', () => {
  const source = readFileSync('scripts/attach-lesson-art.ts', 'utf8')

  it('reuses the shared art-link parser and alt-text helpers', () => {
    expect(source).toMatch(/from '\.\/lesson-sync-helpers'/)
    expect(source).toMatch(/\bparseArtLinks\b/)
    expect(source).toMatch(/\bgetAltText\b/)
  })
})
