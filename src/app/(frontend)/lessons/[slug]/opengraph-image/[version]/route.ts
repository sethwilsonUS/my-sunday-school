import { createLessonSocialImageResponse } from '@/lib/lesson-social-image-response'

type RouteContext = {
  params: Promise<{
    slug: string
  }>
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: RouteContext) {
  const { slug } = await params

  return createLessonSocialImageResponse(slug)
}
