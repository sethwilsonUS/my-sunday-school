import Link from 'next/link'

import { ThemeToggle } from './ThemeToggle'

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link aria-label="Sunday School home" className="brand" href="/">
        <span aria-hidden="true" className="brand__mark">
          SS
        </span>
        <span className="brand__text">
          <span>Sunday School</span>
          <span>Lectionary Notes</span>
        </span>
      </Link>
      <nav aria-label="Primary navigation" className="site-nav">
        <Link href="/lessons">Lessons</Link>
        <Link href="/admin">Admin</Link>
        <ThemeToggle />
      </nav>
    </header>
  )
}
