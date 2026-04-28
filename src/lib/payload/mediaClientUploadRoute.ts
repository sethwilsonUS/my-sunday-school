import { handleUpload } from '@vercel/blob/client'
import type { PayloadRequest } from 'payload'
import { APIError, Forbidden } from 'payload'

type MediaClientUploadRouteOptions = {
  token?: string
}

export function getMediaClientUploadRoute({ token }: MediaClientUploadRouteOptions) {
  return async (req: PayloadRequest) => {
    const request = req as Request
    const body = await request.json()

    try {
      const jsonResponse = await handleUpload({
        body,
        onBeforeGenerateToken: async (_pathname, collectionSlug) => {
          if (collectionSlug !== 'media') {
            throw new Forbidden()
          }

          if (!req.user) {
            throw new Forbidden()
          }

          return {
            access: 'public',
            addRandomSuffix: false,
            allowOverwrite: false,
            cacheControlMaxAge: 60 * 60 * 24 * 365,
          }
        },
        request,
        token,
      })

      return Response.json(jsonResponse)
    } catch (error) {
      req.payload.logger.error(error)
      throw new APIError('media client upload route error')
    }
  }
}
