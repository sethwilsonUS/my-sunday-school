import type { CSSProperties } from 'react'
import Image from 'next/image'
import Link from 'next/link'

import { LessonCard } from '@/components/LessonCard'
import { compact, formatLessonDate, getMediaImageSource } from '@/lib/frontend'
import { splitLessonsForHomepage } from '@/lib/homepage-lessons'
import { getPublishedLessons } from '@/lib/lessons'
import { getLiturgicalTheme } from '@/lib/liturgical-themes'
import { SITE_TAGLINE, getFirstLessonArtwork } from '@/lib/share'

export const dynamic = 'force-dynamic'

type SeasonStyle = CSSProperties & {
  '--season-accent': string
  '--season-accent-dark': string
}

export default async function HomePage() {
  const lessons = await getPublishedLessons()
  const { featuredLesson, featuredLessonContext, supportingLessons } = splitLessonsForHomepage(
    lessons,
  )
  const featuredTheme = featuredLesson
    ? getLiturgicalTheme(featuredLesson.liturgicalSeason)
    : null
  const featuredArtwork = featuredLesson ? getFirstLessonArtwork(featuredLesson) : null
  const featuredArtworkSource = getMediaImageSource(featuredArtwork, ['card', 'large'])
  const featuredArtworkIsPortrait = Boolean(
    featuredArtwork?.width && featuredArtwork?.height && featuredArtwork.height > featuredArtwork.width,
  )
  const featuredArtworkStyle =
    featuredArtwork?.width && featuredArtwork?.height
      ? ({
          '--featured-artwork-aspect-ratio': `${featuredArtwork.width} / ${featuredArtwork.height}`,
        } as CSSProperties)
      : undefined
  const featuredScriptureCount = compact(featuredLesson?.scriptures).length
  const featuredQuestionCount = compact(featuredLesson?.studyQuestions).length
  const featuredSectionKicker =
    featuredLessonContext === 'upcoming' ? 'Upcoming lesson' : 'Featured lesson'
  const featuredSectionTitle =
    featuredLessonContext === 'upcoming' ? 'Ready for Sunday' : 'Most recent lesson'

  return (
    <div className="page-shell">
      <section className="hero">
        <div className="eyebrow">Published lectionary resources</div>
        <h1>{SITE_TAGLINE}</h1>
        <p className="hero__lede">
          A public lesson library shaped by the Revised Common Lectionary, built for study groups,
          teachers, preachers, and anyone looking for the next thread worth pulling.
        </p>
        <div className="hero__actions">
          <Link className="button button--primary" href="/lessons">
            Browse lessons
          </Link>
        </div>
      </section>

      <section aria-labelledby="featured-heading" className="section-grid">
        <div>
          <p className="section-kicker">{featuredSectionKicker}</p>
          <h2 id="featured-heading">{featuredSectionTitle}</h2>
        </div>

        {featuredLesson ? (
          <article
            className={`featured-lesson season-border${featuredArtworkSource ? '' : ' featured-lesson--text-only'}${featuredArtworkIsPortrait ? ' featured-lesson--portrait' : ''}`}
            style={
              {
                '--season-accent': featuredTheme?.accent ?? 'var(--link)',
                '--season-accent-dark': featuredTheme?.accentDark ?? 'var(--link)',
              } as SeasonStyle
            }
          >
            <div className="featured-lesson__content">
              <div className="featured-lesson__meta">
                <span className="season-badge featured-lesson__badge">
                  {featuredTheme?.label ?? 'Lesson'}
                </span>
                <time dateTime={featuredLesson.date}>{formatLessonDate(featuredLesson.date)}</time>
              </div>
              <h3>
                <Link href={`/lessons/${featuredLesson.slug}`}>{featuredLesson.title}</Link>
              </h3>
              <p className="featured-lesson__details">
                {featuredLesson.lectionaryYear
                  ? `Year ${featuredLesson.lectionaryYear}`
                  : 'Lectionary year not set'}
                <span aria-hidden="true"> · </span>
                {featuredScriptureCount} {featuredScriptureCount === 1 ? 'scripture' : 'scriptures'}
                <span aria-hidden="true"> · </span>
                {featuredQuestionCount} {featuredQuestionCount === 1 ? 'question' : 'questions'}
              </p>
            </div>
            {featuredArtwork && featuredArtworkSource ? (
              <Link
                aria-label={`Open featured lesson ${featuredLesson.title}`}
                className="featured-lesson__media"
                href={`/lessons/${featuredLesson.slug}`}
              >
                <span className="featured-lesson__image-shell" style={featuredArtworkStyle}>
                  <Image
                    alt={featuredArtwork.altText ?? featuredLesson.title}
                    className="featured-lesson__image"
                    height={featuredArtworkSource.height ?? featuredArtwork.height ?? 1}
                    priority
                    sizes="(max-width: 720px) calc(100vw - 2rem), 32vw"
                    src={featuredArtworkSource.src}
                    width={featuredArtworkSource.width ?? featuredArtwork.width ?? 1}
                  />
                </span>
              </Link>
            ) : null}
          </article>
        ) : (
          <div className="empty-state">
            <h3>No published lessons yet</h3>
            <p>Create and publish a lesson in Payload, then it will appear here automatically.</p>
          </div>
        )}
      </section>

      <section aria-labelledby="recent-heading" className="lesson-strip">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Published lessons</p>
            <h2 id="recent-heading">More lessons</h2>
          </div>
          <Link href="/lessons">View all</Link>
        </div>
        {supportingLessons.length > 0 ? (
          <div className="lesson-grid">
            {supportingLessons.map((lesson) => (
              <LessonCard key={lesson.id} lesson={lesson} />
            ))}
          </div>
        ) : (
          <div className="empty-state empty-state--compact">
            <p>More published lessons will collect here as the archive grows.</p>
          </div>
        )}
      </section>
    </div>
  )
}
