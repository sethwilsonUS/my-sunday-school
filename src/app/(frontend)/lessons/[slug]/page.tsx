import type { CSSProperties } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { compact, formatLessonDate, getMedia, getMediaUrl } from '@/lib/frontend'
import { getLiturgicalTheme } from '@/lib/liturgical-themes'
import { getPublishedLessonBySlug } from '@/lib/lessons'

type PageProps = {
  params: Promise<{
    slug: string
  }>
}

type SeasonStyle = CSSProperties & {
  '--season-accent': string
  '--season-accent-dark': string
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const lesson = await getPublishedLessonBySlug(slug)

  if (!lesson) {
    return {
      title: 'Lesson not found',
    }
  }

  return {
    description: `Study notes and resources for ${lesson.title}.`,
    title: lesson.title,
  }
}

export default async function LessonPage({ params }: PageProps) {
  const { slug } = await params
  const lesson = await getPublishedLessonBySlug(slug)

  if (!lesson) {
    notFound()
  }

  const theme = getLiturgicalTheme(lesson.liturgicalSeason)
  const scriptures = compact(lesson.scriptures)
  const questions = compact(lesson.studyQuestions)
  const quotes = compact(lesson.quotes)
  const artworks = compact(lesson.artworks)
  const videos = compact(lesson.videoLinks)
  const links = compact(lesson.links)
  const hasStudyMaterial = scriptures.length > 0 || questions.length > 0

  return (
    <article
      className="lesson-page"
      style={
        {
          '--season-accent': theme.accent,
          '--season-accent-dark': theme.accentDark,
        } as SeasonStyle
      }
    >
      <header className="lesson-hero season-border">
        <Link className="back-link" href="/lessons">
          Back to lessons
        </Link>
        <div className="lesson-hero__meta">
          <span className="season-badge">{theme.label}</span>
          <span>{lesson.lectionaryYear ? `Year ${lesson.lectionaryYear}` : 'Lectionary year not set'}</span>
          <time dateTime={lesson.date}>{formatLessonDate(lesson.date)}</time>
        </div>
        <h1>{lesson.title}</h1>
      </header>

      <div className="lesson-layout">
        <div className="lesson-main">
          {!hasStudyMaterial ? (
            <section className="empty-state">
              <h2>Study material coming soon</h2>
              <p>
                This lesson is published and ready to preview, with scriptures and questions still
                being gathered.
              </p>
            </section>
          ) : null}

          {scriptures.length > 0 ? (
            <section className="content-section">
              <h2>Scripture</h2>
              <div className="scripture-list">
                {scriptures.map((scripture) => (
                  <article key={scripture.id ?? scripture.reference} className="scripture-card">
                    <h3>{scripture.reference}</h3>
                    <p className="muted">{scripture.translation ?? 'NRSV-UE'}</p>
                    {scripture.passageText ? <p>{scripture.passageText}</p> : null}
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {questions.length > 0 ? (
            <section className="content-section">
              <h2>Study Questions</h2>
              <ol className="question-list">
                {questions.map((question) => (
                  <li key={question.id ?? question.question}>{question.question}</li>
                ))}
              </ol>
            </section>
          ) : null}

          {quotes.length > 0 ? (
            <section className="content-section">
              <h2>Quotes</h2>
              <div className="quote-list">
                {quotes.map((quote) => (
                  <blockquote key={quote.id ?? quote.text}>
                    <p>{quote.text}</p>
                    {quote.author || quote.source ? (
                      <footer>
                        {quote.author}
                        {quote.author && quote.source ? ', ' : ''}
                        {quote.source}
                      </footer>
                    ) : null}
                  </blockquote>
                ))}
              </div>
            </section>
          ) : null}

          {videos.length > 0 || links.length > 0 ? (
            <section className="content-section">
              <h2>Resources</h2>
              <div className="resource-list">
                {videos.map((video) => (
                  <a key={video.id ?? video.youtubeUrl} href={video.youtubeUrl}>
                    <span>{video.label}</span>
                    <span>Video</span>
                  </a>
                ))}
                {links.map((link) => (
                  <a key={link.id ?? link.url} href={link.url}>
                    <span>{link.label}</span>
                    {link.description ? <span>{link.description}</span> : <span>Link</span>}
                  </a>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside aria-label="Lesson artwork" className="lesson-aside">
          {artworks.length > 0 ? (
            artworks.map((artwork) => {
              const media = getMedia(artwork.image)
              const mediaUrl = getMediaUrl(artwork.image)

              return (
                <figure key={artwork.id ?? media?.id ?? artwork.caption} className="artwork-card">
                  {mediaUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt={media?.altText ?? ''} src={mediaUrl} />
                  ) : null}
                  <figcaption>
                    {artwork.caption ? <span>{artwork.caption}</span> : null}
                    {media?.artist ? <span>{media.artist}</span> : null}
                    {media?.workDate ? <span>{media.workDate}</span> : null}
                    {media?.wikimediaUrl ? (
                      <a href={media.wikimediaUrl} rel="noopener noreferrer" target="_blank">
                        Wikimedia Commons
                      </a>
                    ) : null}
                  </figcaption>
                </figure>
              )
            })
          ) : (
            <div className="empty-state empty-state--compact">
              <p>Artwork can be added from the Payload admin when it is ready.</p>
            </div>
          )}
        </aside>
      </div>
    </article>
  )
}
