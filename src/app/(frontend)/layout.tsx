import type { Metadata } from 'next'
import React from 'react'

import { SiteHeader } from '@/components/SiteHeader'
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_PUBLISHER,
  getCanonicalUrl,
  getMetadataBase,
} from '@/lib/share'

import './styles.css'

export const metadata: Metadata = {
  alternates: {
    canonical: getCanonicalUrl('/'),
  },
  description: SITE_DESCRIPTION,
  metadataBase: getMetadataBase(),
  openGraph: {
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    title: SITE_NAME,
    type: 'website',
    url: getCanonicalUrl('/'),
  },
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  twitter: {
    card: 'summary_large_image',
    description: SITE_DESCRIPTION,
    title: SITE_NAME,
  },
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.setAttribute('data-theme',t)}catch(e){document.documentElement.setAttribute('data-theme','light')}`,
          }}
        />
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <SiteHeader />
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <footer className="site-footer">
          <p>{SITE_NAME}</p>
          <p>
            <a href="https://www.stfrancistyler.org" rel="noopener noreferrer" target="_blank">
              Published in conjunction with {SITE_PUBLISHER}.
            </a>
          </p>
        </footer>
      </body>
    </html>
  )
}
