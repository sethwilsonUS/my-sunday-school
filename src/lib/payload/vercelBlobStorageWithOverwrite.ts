import { cloudStoragePlugin } from '@payloadcms/plugin-cloud-storage'
import type { Adapter } from '@payloadcms/plugin-cloud-storage/types'
import { getFileKey, getFilePrefix } from '@payloadcms/plugin-cloud-storage/utilities'
import { BlobNotFoundError, del, head, put } from '@vercel/blob'
import { getRangeRequestInfo } from 'payload/internal'
import type { Plugin, UploadCollectionSlug } from 'payload'

type VercelBlobStorageWithOverwriteOptions = {
  access?: 'public'
  cacheControlMaxAge?: number
  collections: Partial<Record<UploadCollectionSlug, true>>
  enabled?: boolean
  token: string | undefined
  useCompositePrefixes?: boolean
}

type CreateAdapterArgs = Required<
  Pick<VercelBlobStorageWithOverwriteOptions, 'access' | 'cacheControlMaxAge' | 'useCompositePrefixes'>
> & {
  baseUrl: string
  token: string
}

function generateURL({
  baseUrl,
  collectionPrefix = '',
  filename,
  prefix,
  useCompositePrefixes = false,
}: {
  baseUrl: string
  collectionPrefix?: string
  filename: string
  prefix?: string
  useCompositePrefixes?: boolean
}) {
  const { fileKey } = getFileKey({
    collectionPrefix,
    docPrefix: prefix,
    filename,
    useCompositePrefixes,
  })
  const lastSlashIndex = fileKey.lastIndexOf('/')
  const dir = lastSlashIndex === -1 ? '' : fileKey.slice(0, lastSlashIndex)
  const basename = lastSlashIndex === -1 ? fileKey : fileKey.slice(lastSlashIndex + 1)
  const encodedFilename = encodeURIComponent(basename)

  return `${baseUrl}/${dir ? `${dir}/` : ''}${encodedFilename}`
}

function createVercelBlobAdapter({
  access,
  baseUrl,
  cacheControlMaxAge,
  token,
  useCompositePrefixes,
}: CreateAdapterArgs): Adapter {
  return ({ collection, prefix: collectionPrefix = '' }) => ({
    name: 'vercel-blob',

    generateURL: ({ filename, prefix = '' }) =>
      generateURL({
        baseUrl,
        collectionPrefix,
        filename,
        prefix,
        useCompositePrefixes,
      }),

    handleDelete: async ({ doc: { prefix: docPrefix = '' }, filename }) => {
      const fileUrl = generateURL({
        baseUrl,
        collectionPrefix,
        filename,
        prefix: docPrefix,
        useCompositePrefixes,
      })

      await del(fileUrl, { token })
    },

    handleUpload: async ({ data, file: { buffer, filename, mimeType } }) => {
      const { fileKey } = getFileKey({
        collectionPrefix,
        docPrefix: data.prefix,
        filename,
        useCompositePrefixes,
      })

      await put(fileKey, buffer, {
        access,
        allowOverwrite: true,
        cacheControlMaxAge,
        contentType: mimeType,
        token,
      })
    },

    staticHandler: async (req, { headers, params }) => {
      try {
        const docPrefix = await getFilePrefix({
          clientUploadContext: params.clientUploadContext,
          collection,
          filename: params.filename,
          prefixQueryParam: params.prefix,
          req,
        })
        const fileUrl = generateURL({
          baseUrl,
          collectionPrefix,
          filename: params.filename,
          prefix: docPrefix,
          useCompositePrefixes,
        })
        const uploadedFile = await head(fileUrl, { token })
        const uploadedAtString = uploadedFile.uploadedAt.toISOString()
        const fileKeyForETag = fileUrl.replace(`${baseUrl}/`, '')
        const ETag = `"${fileKeyForETag}-${uploadedAtString}"`
        const rangeResult = getRangeRequestInfo({
          fileSize: uploadedFile.size,
          rangeHeader: req.headers.get('range'),
        })

        if (rangeResult.type === 'invalid') {
          return new Response(null, {
            headers: new Headers(rangeResult.headers),
            status: rangeResult.status,
          })
        }

        let responseHeaders = new Headers(headers)

        for (const [key, value] of Object.entries(rangeResult.headers)) {
          responseHeaders.append(key, value)
        }

        responseHeaders.append('Cache-Control', `public, max-age=${cacheControlMaxAge}`)
        responseHeaders.append('Content-Disposition', uploadedFile.contentDisposition)
        responseHeaders.append('Content-Type', uploadedFile.contentType)
        responseHeaders.append('ETag', ETag)

        if (uploadedFile.contentType === 'image/svg+xml') {
          responseHeaders.append('Content-Security-Policy', "script-src 'none'")
        }

        if (
          collection.upload &&
          typeof collection.upload === 'object' &&
          typeof collection.upload.modifyResponseHeaders === 'function'
        ) {
          responseHeaders =
            collection.upload.modifyResponseHeaders({ headers: responseHeaders }) || responseHeaders
        }

        const requestETag = req.headers.get('etag') || req.headers.get('if-none-match')

        if (requestETag && requestETag === ETag) {
          return new Response(null, {
            headers: responseHeaders,
            status: 304,
          })
        }

        const response = await fetch(`${fileUrl}?${uploadedAtString}`, {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            Pragma: 'no-cache',
            ...(rangeResult.type === 'partial' && {
              Range: `bytes=${rangeResult.rangeStart}-${rangeResult.rangeEnd}`,
            }),
          },
        })

        if (!response.ok || !response.body) {
          return new Response(null, {
            status: 204,
            statusText: 'No Content',
          })
        }

        responseHeaders.append('Last-Modified', uploadedAtString)

        return new Response(response.body, {
          headers: responseHeaders,
          status: rangeResult.status,
        })
      } catch (err) {
        if (err instanceof BlobNotFoundError) {
          return new Response(null, {
            status: 404,
            statusText: 'Not Found',
          })
        }

        req.payload.logger.error({
          err,
          msg: 'Unexpected error in Vercel Blob staticHandler',
        })

        return new Response('Internal Server Error', { status: 500 })
      }
    },
  })
}

export function vercelBlobStorageWithOverwrite({
  access = 'public',
  cacheControlMaxAge = 60 * 60 * 24 * 365,
  collections,
  enabled = true,
  token,
  useCompositePrefixes = false,
}: VercelBlobStorageWithOverwriteOptions): Plugin {
  return (incomingConfig) => {
    const storeId = token?.match(/^vercel_blob_rw_([a-z\d]+)_[a-z\d]+$/i)?.[1]?.toLowerCase()
    const isPluginDisabled = enabled === false || !token

    if (!storeId && !isPluginDisabled) {
      throw new Error(
        'Invalid token format for Vercel Blob adapter. Should be vercel_blob_rw_<store_id>_<random_string>.',
      )
    }

    if (isPluginDisabled) {
      return incomingConfig
    }

    const baseUrl =
      process.env.STORAGE_VERCEL_BLOB_BASE_URL ||
      `https://${storeId}.${access}.blob.vercel-storage.com`
    const adapter = createVercelBlobAdapter({
      access,
      baseUrl,
      cacheControlMaxAge,
      token,
      useCompositePrefixes,
    })
    const collectionsWithAdapter = Object.fromEntries(
      Object.entries(collections).map(([slug, collectionOptions]) => [
        slug,
        {
          ...(collectionOptions === true ? {} : collectionOptions),
          adapter,
        },
      ]),
    )

    return cloudStoragePlugin({
      collections: collectionsWithAdapter,
      useCompositePrefixes,
    })(incomingConfig)
  }
}
