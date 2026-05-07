import type { Payload } from 'payload'

import { getCanonicalUrl, getLessonPath } from '@/lib/share'

type LessonsPublicLinkProps = {
  id?: number | string
  payload: Payload
}

// This server-rendered status is available on load; dynamic save announcements need client UI.
function PublicLinkStatus({ children }: { children: string }) {
  return (
    <p className="admin-branding__inline-note" role="status">
      {children}
    </p>
  )
}

export async function LessonsPublicLink({ id, payload }: LessonsPublicLinkProps) {
  if (!id) {
    return <PublicLinkStatus>Save this lesson to get a public link.</PublicLinkStatus>
  }

  try {
    const lesson = await payload.findByID({
      collection: 'lessons',
      depth: 0,
      id,
    })

    if (!lesson.slug) {
      return <PublicLinkStatus>Save this lesson to get a public link.</PublicLinkStatus>
    }

    if (lesson.status !== 'published') {
      return (
        <PublicLinkStatus>Set this lesson to Published to open the public page.</PublicLinkStatus>
      )
    }

    return (
      <a
        aria-label="View public lesson (opens in a new tab)"
        className="btn btn--style-secondary admin-branding__public-link"
        href={getCanonicalUrl(getLessonPath(lesson.slug))}
        rel="noopener noreferrer"
        target="_blank"
      >
        View public lesson
      </a>
    )
  } catch {
    return <PublicLinkStatus>Save this lesson to get a public link.</PublicLinkStatus>
  }
}
