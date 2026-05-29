export const OBSERVANCE_TYPE_OPTIONS = [
  { label: 'Sunday Lesson', value: 'sunday' },
  { label: 'Holy Day', value: 'holy-day' },
  { label: 'Commemoration', value: 'commemoration' },
  { label: 'Other', value: 'other' },
] as const

export type ObservanceType = (typeof OBSERVANCE_TYPE_OPTIONS)[number]['value']

export const DEFAULT_OBSERVANCE_TYPE = 'sunday' satisfies ObservanceType

export const OBSERVANCE_TYPE_VALUES = OBSERVANCE_TYPE_OPTIONS.map((option) => option.value)

const OBSERVANCE_TYPE_LABELS = new Map<ObservanceType, string>(
  OBSERVANCE_TYPE_OPTIONS.map((option) => [option.value, option.label]),
)

const OBSERVANCE_TYPE_ORDER = new Map<ObservanceType, number>(
  OBSERVANCE_TYPE_VALUES.map((value, index) => [value, index]),
)

type LessonDetailFields = {
  lectionaryYear?: 'A' | 'B' | 'C' | null
  observanceType?: ObservanceType | null
}

type LessonSortFields = {
  observanceType?: ObservanceType | null
  title?: string | null
}

export function parseObservanceType(value: string | null | undefined): ObservanceType {
  if (!value?.trim()) {
    return DEFAULT_OBSERVANCE_TYPE
  }

  if (OBSERVANCE_TYPE_VALUES.includes(value as ObservanceType)) {
    return value as ObservanceType
  }

  throw new Error('--observance-type must be sunday, holy-day, commemoration, or other.')
}

export function getObservanceTypeLabel(value: ObservanceType | null | undefined) {
  return OBSERVANCE_TYPE_LABELS.get(value ?? DEFAULT_OBSERVANCE_TYPE) ?? 'Other'
}

export function getLessonDetailLabel(lesson: LessonDetailFields) {
  const observanceType = lesson.observanceType ?? DEFAULT_OBSERVANCE_TYPE

  if (observanceType === 'sunday' && lesson.lectionaryYear) {
    return `Year ${lesson.lectionaryYear}`
  }

  if (observanceType !== 'sunday' && lesson.lectionaryYear) {
    return `${getObservanceTypeLabel(observanceType)}, Year ${lesson.lectionaryYear}`
  }

  return getObservanceTypeLabel(observanceType)
}

export function compareLessonObservance(a: LessonSortFields, b: LessonSortFields) {
  const aRank = OBSERVANCE_TYPE_ORDER.get(a.observanceType ?? DEFAULT_OBSERVANCE_TYPE) ?? 99
  const bRank = OBSERVANCE_TYPE_ORDER.get(b.observanceType ?? DEFAULT_OBSERVANCE_TYPE) ?? 99

  if (aRank !== bRank) {
    return aRank - bRank
  }

  return (a.title ?? '').localeCompare(b.title ?? '')
}
