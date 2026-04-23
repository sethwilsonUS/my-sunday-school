import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import './styles.css'

export default function HomePage() {
  return (
    <div className="home">
      <div className="content">
        <picture>
          <source srcSet="https://raw.githubusercontent.com/payloadcms/payload/main/packages/ui/src/assets/payload-favicon.svg" />
          <Image
            alt="Payload Logo"
            height={65}
            src="https://raw.githubusercontent.com/payloadcms/payload/main/packages/ui/src/assets/payload-favicon.svg"
            width={65}
          />
        </picture>
        <h1>Sunday School CMS</h1>
        <p className="lede">Payload and Next.js are ready for the Neon database setup.</p>
        <div className="links">
          <Link className="admin" href="/admin">
            Admin panel
          </Link>
          <a
            className="docs"
            href="https://payloadcms.com/docs"
            rel="noopener noreferrer"
            target="_blank"
          >
            Documentation
          </a>
        </div>
      </div>
      <div className="footer">Phase 0 scaffold complete</div>
    </div>
  )
}
