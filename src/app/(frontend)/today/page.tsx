import type { Metadata } from 'next'
import Link from 'next/link'

import { LessonCard } from '@/components/LessonCard'
import { formatLessonDate } from '@/lib/frontend'
import { getCentralDateKey, LESSON_TIME_ZONE } from '@/lib/lesson-dates'
import { getPublishedLessonsByDate } from '@/lib/lessons'
import { SITE_NAME, getCanonicalUrl } from '@/lib/share'

export const dynamic = 'force-dynamic'

const description = `Published lectionary lessons available for today in ${LESSON_TIME_ZONE}.`

export const metadata: Metadata = {
  alternates: {
    canonical: getCanonicalUrl('/today'),
  },
  description,
  openGraph: {
    description,
    siteName: SITE_NAME,
    title: "Today's Lectionary",
    type: 'website',
    url: getCanonicalUrl('/today'),
  },
  title: "Today's Lectionary",
  twitter: {
    card: 'summary_large_image',
    description,
    title: `Today's Lectionary | ${SITE_NAME}`,
  },
}

export default async function TodayPage() {
  const todayKey = getCentralDateKey()
  const lessons = await getPublishedLessonsByDate(todayKey)

  return (
    <div className="page-shell">
      <section className="page-intro">
        <p className="section-kicker">Today&apos;s Lectionary</p>
        <h1>Today&apos;s Lectionary</h1>
        <p>
          Published lessons appointed for {formatLessonDate(todayKey)}, using Central Time for the
          calendar day.
        </p>
      </section>

      <section aria-labelledby="today-heading" className="lesson-strip">
        <div className="section-heading">
          <div>
            <p className="section-kicker">{lessons.length} published</p>
            <h2 id="today-heading">Available today</h2>
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
            <h3>No lesson published for today</h3>
            <p>
              When a Sunday, holy day, commemoration, or other observance is published for this
              date, it will appear here automatically.
            </p>
            <div className="hero__actions">
              <Link className="button button--primary" href="/lessons">
                Browse lessons
              </Link>
              <Link className="button button--ghost" href="/">
                Next Sunday
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
