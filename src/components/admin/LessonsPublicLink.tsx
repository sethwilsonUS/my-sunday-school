import type { Payload } from 'payload'

import { getCanonicalUrl, getLessonPath } from '@/lib/share'

type LessonsPublicLinkProps = {
  id?: number | string
  payload: Payload
}

export async function LessonsPublicLink({ id, payload }: LessonsPublicLinkProps) {
  if (!id) {
    return <p className="admin-branding__inline-note">Save this lesson to get a public link.</p>
  }

  try {
    const lesson = await payload.findByID({
      collection: 'lessons',
      depth: 0,
      id,
    })

    if (!lesson.slug) {
      return <p className="admin-branding__inline-note">Save this lesson to get a public link.</p>
    }

    if (lesson.status !== 'published') {
      return (
        <p className="admin-branding__inline-note">
          Set this lesson to Published to open the public page.
        </p>
      )
    }

    return (
      <a
        className="btn btn--style-secondary admin-branding__public-link"
        href={getCanonicalUrl(getLessonPath(lesson.slug))}
        rel="noreferrer"
        target="_blank"
      >
        View public lesson
      </a>
    )
  } catch {
    return <p className="admin-branding__inline-note">Save this lesson to get a public link.</p>
  }
}
