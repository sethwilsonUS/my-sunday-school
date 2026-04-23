import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="page-shell">
      <section className="empty-state not-found-panel">
        <p className="section-kicker">404</p>
        <h1>Lesson not found</h1>
        <p>The lesson may still be a draft, or the link may have changed.</p>
        <Link className="button button--primary" href="/lessons">
          Browse published lessons
        </Link>
      </section>
    </div>
  )
}
