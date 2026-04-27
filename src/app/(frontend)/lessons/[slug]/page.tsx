import type { CSSProperties } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ArtworkCard } from '@/components/ArtworkCard'
import { compact, formatLessonDate, getMedia, getMediaUrl } from '@/lib/frontend'
import { getLiturgicalTheme } from '@/lib/liturgical-themes'
import { getPublishedLessonBySlug } from '@/lib/lessons'
import { markdownToHTML } from '@/lib/markdown'
import { richTextToHTML } from '@/lib/richText'
import { SITE_NAME, getCanonicalUrl, getLessonMetadataLabel, getLessonPath } from '@/lib/share'

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

  const canonicalPath = getLessonPath(slug)
  const description = `Study notes and resources for ${lesson.title}.`
  const lessonMetaLabel = getLessonMetadataLabel(lesson)
  const metadataTitle = `${lesson.title} | ${lessonMetaLabel}`

  return {
    alternates: {
      canonical: getCanonicalUrl(canonicalPath),
    },
    description,
    openGraph: {
      description,
      siteName: SITE_NAME,
      title: metadataTitle,
      type: 'article',
      url: getCanonicalUrl(canonicalPath),
    },
    title: {
      absolute: metadataTitle,
    },
    twitter: {
      card: 'summary_large_image',
      description,
      title: metadataTitle,
    },
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
  const musings = compact(lesson.musings)
    .map((musing) => ({
      ...musing,
      html: markdownToHTML(musing.body),
    }))
    .filter((musing) => Boolean(musing.html))
  const hasAsideResources = videos.length > 0 || links.length > 0
  const hasLessonContent =
    Boolean(lesson.collect) ||
    musings.length > 0 ||
    scriptures.length > 0 ||
    questions.length > 0 ||
    quotes.length > 0 ||
    videos.length > 0 ||
    links.length > 0

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
          <span>
            {lesson.lectionaryYear ? `Year ${lesson.lectionaryYear}` : 'Lectionary year not set'}
          </span>
          <time dateTime={lesson.date}>{formatLessonDate(lesson.date)}</time>
        </div>
        <h1>{lesson.title}</h1>
      </header>

      <div className="lesson-layout">
        <div className="lesson-main">
          {!hasLessonContent ? (
            <section className="empty-state">
              <h2>Study material coming soon</h2>
              <p>
                This lesson is published and ready to preview, with scriptures and questions still
                being gathered.
              </p>
            </section>
          ) : null}

          {lesson.collect ? (
            <section className="content-section collect-section" aria-labelledby="collect-heading">
              <h2 id="collect-heading">Collect</h2>
              <div className="collect-card season-border">
                <p className="collect-card__eyebrow">Prayer of the day</p>
                <p className="collect-card__text">{lesson.collect}</p>
              </div>
            </section>
          ) : null}

          {scriptures.length > 0 ? (
            <section className="content-section">
              <h2>Scripture</h2>
              <div className="scripture-list">
                {scriptures.map((scripture) => (
                  <details
                    key={scripture.id ?? scripture.reference}
                    className="scripture-card scripture-accordion"
                  >
                    <summary>
                      <span className="scripture-accordion__reference">{scripture.reference}</span>
                    </summary>
                    <div className="scripture-accordion__content">
                      <p className="muted">{scripture.translation ?? 'NRSV-UE'}</p>
                      {scripture.passageText ? (
                        <div
                          className="rich-text scripture-text"
                          dangerouslySetInnerHTML={{
                            __html: richTextToHTML(scripture.passageText) ?? '',
                          }}
                        />
                      ) : null}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          ) : null}

          {quotes.length > 0 ? (
            <section className="content-section quote-section">
              <h2>Quotes</h2>
              <div className="quote-list">
                {quotes.map((quote) => {
                  const attribution = [quote.author, quote.source, quote.year]
                    .filter(Boolean)
                    .join(', ')

                  return (
                    <blockquote key={quote.id ?? quote.text}>
                      <p>{quote.text}</p>
                      {attribution ? <footer>{attribution}</footer> : null}
                    </blockquote>
                  )
                })}
              </div>
            </section>
          ) : null}

          {questions.length > 0 ? (
            <section className="content-section question-section">
              <h2>Study Questions</h2>
              <ol className="question-list">
                {questions.map((question) => (
                  <li key={question.id ?? question.question}>{question.question}</li>
                ))}
              </ol>
            </section>
          ) : null}

          {musings.length > 0 ? (
            <section className="content-section musings-section">
              <h2>Musings</h2>
              <div className="musings-list">
                {musings.map((musing) => (
                  <article className="musings-card season-border" key={musing.id ?? musing.title}>
                    <header className="musings-card__header">
                      <h3>{musing.title}</h3>
                      <p>By {musing.author}</p>
                    </header>
                    <div
                      className="markdown-content musings-markdown"
                      dangerouslySetInnerHTML={{ __html: musing.html ?? '' }}
                    />
                  </article>
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
                <ArtworkCard
                  alt={media?.altText ?? artwork.caption ?? 'Artwork'}
                  artist={media?.artist}
                  caption={artwork.caption}
                  imageHeight={media?.height}
                  imageWidth={media?.width}
                  key={artwork.id ?? media?.id ?? artwork.caption}
                  medium={media?.medium}
                  sourceUrl={media?.wikimediaUrl}
                  src={mediaUrl}
                  workDate={media?.workDate}
                />
              )
            })
          ) : !hasAsideResources ? (
            <div className="empty-state empty-state--compact">
              <p>Artwork can be added from the Payload admin when it is ready.</p>
            </div>
          ) : null}

          {hasAsideResources ? (
            <section className="lesson-aside__section">
              <h2 className="lesson-aside__heading">Resources</h2>
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
        </aside>
      </div>
    </article>
  )
}
