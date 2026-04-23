'use client'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="page-shell">
      <section className="empty-state not-found-panel">
        <p className="section-kicker">Something went sideways</p>
        <h1>We could not load the lessons</h1>
        <p>{error.message || 'Try again, or come back in a moment.'}</p>
        <button className="button button--primary" onClick={reset} type="button">
          Try again
        </button>
      </section>
    </div>
  )
}
