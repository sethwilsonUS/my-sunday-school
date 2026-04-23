import Link from 'next/link'

import { LessonCard } from '@/components/LessonCard'
import { SEASON_OPTIONS, type LiturgicalSeason } from '@/lib/liturgical-themes'
import { getPublishedLessons, type LessonFilters } from '@/lib/lessons'

const YEAR_OPTIONS = ['A', 'B', 'C'] as const

export const dynamic = 'force-dynamic'

type SearchParams = {
  season?: string
  year?: string
}

const getFilters = (searchParams: SearchParams): LessonFilters => {
  const season = SEASON_OPTIONS.some((option) => option.value === searchParams.season)
    ? (searchParams.season as LiturgicalSeason)
    : undefined
  const year = YEAR_OPTIONS.some((option) => option === searchParams.year)
    ? (searchParams.year as LessonFilters['year'])
    : undefined

  return { season, year }
}

export const metadata = {
  description: 'Browse published Sunday school lessons by liturgical season and lectionary year.',
  title: 'Lessons',
}

export default async function LessonsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const params = (await searchParams) ?? {}
  const filters = getFilters(params)
  const lessons = await getPublishedLessons(filters)
  const hasFilters = Boolean(filters.season || filters.year)

  return (
    <div className="page-shell">
      <section className="page-intro">
        <p className="section-kicker">Lesson archive</p>
        <h1>Published lessons</h1>
        <p>
          Browse by date, season, or lectionary year. Draft lessons remain private until they are
          intentionally published.
        </p>
      </section>

      <form action="/lessons" className="filter-panel">
        <fieldset>
          <legend>Filter lessons</legend>
          <label>
            <span>Season</span>
            <select defaultValue={filters.season ?? ''} name="season">
              <option value="">All seasons</option>
              {SEASON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Lectionary year</span>
            <select defaultValue={filters.year ?? ''} name="year">
              <option value="">All years</option>
              {YEAR_OPTIONS.map((year) => (
                <option key={year} value={year}>
                  Year {year}
                </option>
              ))}
            </select>
          </label>
          <div className="filter-panel__actions">
            <button className="button button--primary" type="submit">
              Apply filters
            </button>
            {hasFilters ? (
              <Link className="button button--ghost" href="/lessons">
                Clear
              </Link>
            ) : null}
          </div>
        </fieldset>
      </form>

      <section aria-labelledby="archive-heading" className="lesson-strip">
        <div className="section-heading">
          <div>
            <p className="section-kicker">{lessons.length} published</p>
            <h2 id="archive-heading">{hasFilters ? 'Filtered lessons' : 'All lessons'}</h2>
          </div>
        </div>
        {lessons.length > 0 ? (
          <div className="lesson-grid">
            {lessons.map((lesson) => (
              <LessonCard key={lesson.id} lesson={lesson} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>No lessons match those filters</h3>
            <p>Clear the filters or publish a lesson for this season and year.</p>
          </div>
        )}
      </section>
    </div>
  )
}
