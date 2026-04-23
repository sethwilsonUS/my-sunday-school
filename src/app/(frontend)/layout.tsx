import React from 'react'
import './styles.css'

export const metadata = {
  description: 'A Sunday school resource CMS built with Payload and Next.js.',
  title: 'Sunday School CMS',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  )
}
