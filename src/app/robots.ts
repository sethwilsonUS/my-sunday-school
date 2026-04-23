import type { MetadataRoute } from 'next'

import { getSiteOrigin } from '@/lib/share'

export default function robots(): MetadataRoute.Robots {
  const host = getSiteOrigin()

  return {
    host,
    rules: [
      {
        userAgent: '*',
        allow: '/',
      },
      {
        userAgent: 'facebookexternalhit',
        allow: '/',
      },
      {
        userAgent: 'Facebot',
        allow: '/',
      },
      {
        userAgent: 'Twitterbot',
        allow: '/',
      },
    ],
  }
}
