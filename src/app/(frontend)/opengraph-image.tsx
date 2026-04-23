import { ImageResponse } from 'next/og'

import { SiteSocialCard, ogContentType, ogSize } from '@/lib/social-image'
import { SITE_NAME } from '@/lib/share'

export const runtime = 'nodejs'

export const alt = SITE_NAME
export const size = ogSize
export const contentType = ogContentType

export default function OpenGraphImage() {
  return new ImageResponse(<SiteSocialCard />, {
    ...ogSize,
  })
}
