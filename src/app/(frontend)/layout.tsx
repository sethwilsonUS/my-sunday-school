import React from 'react'

import { SiteHeader } from '@/components/SiteHeader'

import './styles.css'

export const metadata = {
  description: 'Published Sunday school lessons, scripture notes, artwork, and study questions.',
  title: {
    default: 'Sunday School Lectionary Notes',
    template: '%s | Sunday School Lectionary Notes',
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
          <p>Sunday School Lectionary Notes</p>
          <p>Published lessons are open to everyone. Drafts stay tucked away in the admin.</p>
        </footer>
      </body>
    </html>
  )
}
