type DatedLesson = {
  date: string
}

export type HomepageLessonSelection<T extends DatedLesson> = {
  featuredLesson: T | null
  featuredLessonContext: 'upcoming' | 'past' | 'none'
  supportingLessons: T[]
}

const getUTCDayValue = (value: string | Date) => {
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.valueOf())) {
    return null
  }

  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

export const splitLessonsForHomepage = <T extends DatedLesson>(
  lessons: T[],
  today = new Date(),
): HomepageLessonSelection<T> => {
  if (lessons.length === 0) {
    return {
      featuredLesson: null,
      featuredLessonContext: 'none',
      supportingLessons: [],
    }
  }

  const todayValue = getUTCDayValue(today)

  if (todayValue === null) {
    return {
      featuredLesson: lessons[0] ?? null,
      featuredLessonContext: 'past',
      supportingLessons: lessons.slice(1),
    }
  }

  let closestUpcomingIndex = -1
  let closestUpcomingDiff = Number.POSITIVE_INFINITY
  let mostRecentPastIndex = -1
  let mostRecentPastValue = Number.NEGATIVE_INFINITY

  lessons.forEach((lesson, index) => {
    const lessonDayValue = getUTCDayValue(lesson.date)

    if (lessonDayValue === null) {
      return
    }

    const dayDiff = lessonDayValue - todayValue

    if (dayDiff >= 0 && dayDiff < closestUpcomingDiff) {
      closestUpcomingDiff = dayDiff
      closestUpcomingIndex = index
    }

    if (dayDiff < 0 && lessonDayValue > mostRecentPastValue) {
      mostRecentPastValue = lessonDayValue
      mostRecentPastIndex = index
    }
  })

  const featuredIndex =
    closestUpcomingIndex >= 0
      ? closestUpcomingIndex
      : mostRecentPastIndex >= 0
        ? mostRecentPastIndex
        : 0
  const featuredLesson = lessons[featuredIndex] ?? null

  return {
    featuredLesson,
    featuredLessonContext: closestUpcomingIndex >= 0 ? 'upcoming' : 'past',
    supportingLessons: lessons.filter((_lesson, index) => index !== featuredIndex),
  }
}
