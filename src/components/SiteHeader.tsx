import Link from 'next/link'

import { BrandMark } from './BrandMark'
import { ThemeToggle } from './ThemeToggle'
import { SITE_NAME, SITE_SUBTITLE } from '@/lib/share'

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link aria-label="Lectionary Lessons home" className="brand" href="/">
        <span aria-hidden="true" className="brand__mark">
          <BrandMark size={28} />
        </span>
        <span className="brand__text">
          <span>{SITE_NAME}</span>
          <span>{SITE_SUBTITLE}</span>
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
