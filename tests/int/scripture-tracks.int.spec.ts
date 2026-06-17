import { describe, expect, it } from 'vitest'

import { getScriptureTrackLabel } from '@/lib/scripture-tracks'

describe('scripture track labels', () => {
  it('only returns public badge labels for numbered tracks', () => {
    expect(getScriptureTrackLabel('track-1')).toBe('Track 1')
    expect(getScriptureTrackLabel('track-2')).toBe('Track 2')
    expect(getScriptureTrackLabel('none')).toBeNull()
    expect(getScriptureTrackLabel(null)).toBeNull()
    expect(getScriptureTrackLabel(undefined)).toBeNull()
  })
})
