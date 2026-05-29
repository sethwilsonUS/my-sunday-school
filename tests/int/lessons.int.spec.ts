import { describe, expect, it } from 'vitest'

import { isMissingObservanceTypeColumn, legacyLessonDetailSelect } from '@/lib/lessons'

describe('lesson query fallbacks', () => {
  it('recognizes missing observance type column errors from Postgres', () => {
    expect(
      isMissingObservanceTypeColumn(new Error('column lessons.observance_type does not exist')),
    ).toBe(true)
    expect(
      isMissingObservanceTypeColumn(new Error('column "observance_type" does not exist')),
    ).toBe(true)
    expect(
      isMissingObservanceTypeColumn(
        new Error('code 42703: undefined_column for lessons.observance_type'),
      ),
    ).toBe(true)
  })

  it('does not treat unrelated Payload errors as migration fallback candidates', () => {
    expect(isMissingObservanceTypeColumn(new Error('missing secret key'))).toBe(false)
    expect(isMissingObservanceTypeColumn(new Error('missing observance_type setting'))).toBe(false)
    expect(
      isMissingObservanceTypeColumn(new Error('column users.observance_type does not exist')),
    ).toBe(false)
    expect(
      isMissingObservanceTypeColumn(new Error('code 42703: undefined_column for users.name')),
    ).toBe(false)
  })

  it('selects the fields needed to return a fallback lesson detail safely', () => {
    expect(legacyLessonDetailSelect).toMatchObject({
      createdAt: true,
      status: true,
      updatedAt: true,
    })
  })
})
