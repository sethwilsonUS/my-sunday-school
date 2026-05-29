import { describe, expect, it } from 'vitest'

import { isMissingObservanceTypeColumn } from '@/lib/lessons'

describe('lesson query fallbacks', () => {
  it('recognizes missing observance type column errors from Postgres', () => {
    expect(
      isMissingObservanceTypeColumn(new Error('column lessons.observance_type does not exist')),
    ).toBe(true)
  })

  it('does not treat unrelated Payload errors as migration fallback candidates', () => {
    expect(isMissingObservanceTypeColumn(new Error('missing secret key'))).toBe(false)
  })
})
