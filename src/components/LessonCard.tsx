import type { CSSProperties } from 'react'
import Link from 'next/link'

import type { Lesson } from '@/payload-types'
import { compact, formatShortDate } from '@/lib/frontend'
import { getLiturgicalTheme } from '@/lib/liturgical-themes'

type SeasonStyle = CSSProperties & {
  '--season-accent': string
  '--season-accent-dark': string
}

export function LessonCard({ lesson }: { lesson: Lesson }) {
  const theme = getLiturgicalTheme(lesson.liturgicalSeason)
  const scriptureCount = compact(lesson.scriptures).length
  const questionCount = compact(lesson.studyQuestions).length

  return (
    <article
      className="lesson-card season-border"
      style={
        {
          '--season-accent': theme.accent,
          '--season-accent-dark': theme.accentDark,
        } as SeasonStyle
      }
    >
      <div className="lesson-card__meta">
        <span className="season-badge">{theme.label}</span>
        <time dateTime={lesson.date}>{formatShortDate(lesson.date)}</time>
      </div>
      <h3>
        <Link href={`/lessons/${lesson.slug}`}>{lesson.title}</Link>
      </h3>
      <p className="lesson-card__details">
        {lesson.lectionaryYear ? `Year ${lesson.lectionaryYear}` : 'Lectionary year not set'}
        <span aria-hidden="true"> · </span>
        {scriptureCount} {scriptureCount === 1 ? 'scripture' : 'scriptures'}
        <span aria-hidden="true"> · </span>
        {questionCount} {questionCount === 1 ? 'question' : 'questions'}
      </p>
    </article>
  )
}
