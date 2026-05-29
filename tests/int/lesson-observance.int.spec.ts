import { describe, expect, it } from 'vitest'

import {
  compareLessonObservance,
  getLessonDetailLabel,
  getObservanceTypeLabel,
  parseObservanceType,
} from '@/lib/observance-types'

describe('lesson observance helpers', () => {
  it('labels known observance types for public display', () => {
    expect(getObservanceTypeLabel('holy-day')).toBe('Holy Day')
    expect(getObservanceTypeLabel('commemoration')).toBe('Commemoration')
  })

  it('avoids lectionary-year placeholder copy for non-Sunday lessons', () => {
    expect(getLessonDetailLabel({ lectionaryYear: null, observanceType: 'holy-day' })).toBe(
      'Holy Day',
    )
    expect(getLessonDetailLabel({ lectionaryYear: null, observanceType: 'sunday' })).toBe(
      'Sunday Lesson',
    )
    expect(getLessonDetailLabel({ lectionaryYear: 'C', observanceType: 'sunday' })).toBe('Year C')
  })

  it('sorts same-day lessons by observance priority and title', () => {
    const lessons = [
      { observanceType: 'commemoration', title: 'Bede' },
      { observanceType: 'sunday', title: 'Trinity Sunday' },
      { observanceType: 'holy-day', title: 'The Visitation' },
      { observanceType: 'commemoration', title: 'Athanasius' },
    ] as const

    expect([...lessons].sort(compareLessonObservance).map((lesson) => lesson.title)).toEqual([
      'Trinity Sunday',
      'The Visitation',
      'Athanasius',
      'Bede',
    ])
  })

  it('parses supported CLI observance type values', () => {
    expect(parseObservanceType(undefined)).toBe('sunday')
    expect(parseObservanceType('holy-day')).toBe('holy-day')
    expect(() => parseObservanceType('feast')).toThrow(
      '--observance-type must be sunday, holy-day, commemoration, or other.',
    )
  })
})
