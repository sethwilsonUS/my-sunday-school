import { describe, expect, it } from 'vitest'

import { getCentralDateKey, getNextDateKey } from '@/lib/lesson-dates'

describe('lesson date helpers', () => {
  it('uses America/Chicago when resolving today', () => {
    expect(getCentralDateKey(new Date('2026-05-31T04:30:00.000Z'))).toBe('2026-05-30')
    expect(getCentralDateKey(new Date('2026-05-31T05:30:00.000Z'))).toBe('2026-05-31')
  })

  it('calculates the next calendar date key without timezone drift', () => {
    expect(getNextDateKey('2026-05-31')).toBe('2026-06-01')
  })

  it('rejects non-canonical date keys instead of rolling them forward', () => {
    expect(() => getNextDateKey('2026-02-31')).toThrow('Invalid date key: 2026-02-31')
    expect(() => getNextDateKey('2026-2-03')).toThrow('Invalid date key: 2026-2-03')
  })
})
