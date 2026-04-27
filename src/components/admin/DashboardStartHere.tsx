import Link from 'next/link'

export function DashboardStartHere() {
  return (
    <section aria-labelledby="admin-start-here-title" className="admin-branding-card">
      <div className="admin-branding-card__content">
        <p className="admin-branding__eyebrow">Start here</p>
        <h2 className="admin-branding__title" id="admin-start-here-title">
          Keep the editorial flow calm
        </h2>
        <p className="admin-branding__body">
          Begin in Lessons for weekly content, or jump into Media when you need artwork,
          attribution, and alt text squared away.
        </p>
      </div>
      <div className="admin-branding__actions">
        <Link className="btn btn--style-secondary" href="/admin/collections/lessons">
          Open Lessons
        </Link>
        <Link className="btn btn--style-secondary" href="/admin/collections/media">
          Open Media
        </Link>
      </div>
      <p className="admin-branding__meta">
        Published lessons appear on the public site. Drafts stay tucked away in the admin until
        you are ready.
      </p>
    </section>
  )
}
