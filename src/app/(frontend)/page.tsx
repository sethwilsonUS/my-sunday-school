import Link from 'next/link'

import { LessonCard } from '@/components/LessonCard'
import { formatLessonDate } from '@/lib/frontend'
import { getPublishedLessons } from '@/lib/lessons'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const lessons = await getPublishedLessons({}, 4)
  const featuredLesson = lessons[0]
  const supportingLessons = lessons.slice(1)

  return (
    <div className="page-shell">
      <section className="hero">
        <div className="eyebrow">Published Sunday school resources</div>
        <h1>Scripture, art, and questions for the next faithful conversation.</h1>
        <p className="hero__lede">
          A public lesson library shaped by the lectionary, built for students to read before
          class and for teachers to find the next thread worth pulling.
        </p>
        <div className="hero__actions">
          <Link className="button button--primary" href="/lessons">
            Browse lessons
          </Link>
          <Link className="button button--ghost" href="/admin">
            Open admin
          </Link>
        </div>
      </section>

      <section aria-labelledby="featured-heading" className="section-grid">
        <div>
          <p className="section-kicker">Latest lesson</p>
          <h2 id="featured-heading">Ready for study</h2>
        </div>

        {featuredLesson ? (
          <article className="featured-lesson">
            <p className="featured-lesson__date">{formatLessonDate(featuredLesson.date)}</p>
            <h3>
              <Link href={`/lessons/${featuredLesson.slug}`}>{featuredLesson.title}</Link>
            </h3>
            <p>
              Year {featuredLesson.lectionaryYear ?? 'not set'} ·{' '}
              {featuredLesson.studyQuestions?.length ?? 0} study questions ·{' '}
              {featuredLesson.artworks?.length ?? 0} artwork
            </p>
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
            <p className="section-kicker">Recent notes</p>
            <h2 id="recent-heading">More from the archive</h2>
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
