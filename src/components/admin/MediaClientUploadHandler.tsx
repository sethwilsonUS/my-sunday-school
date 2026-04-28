'use client'

import { upload } from '@vercel/blob/client'
import { useConfig, useEffectEvent, useUploadHandlers } from '@payloadcms/ui'
import { formatAdminURL, sanitizeFilename } from 'payload/shared'
import { Fragment, useEffect } from 'react'
import type { ReactNode } from 'react'

type MediaClientUploadHandlerProps = {
  children: ReactNode
}

const collectionSlug = 'media'
const serverHandlerPath = '/vercel-blob-client-upload-route'

function getRandomHex(bytes = 16) {
  const values = new Uint8Array(bytes)
  globalThis.crypto.getRandomValues(values)

  return Array.from(values, (value) => value.toString(16).padStart(2, '0')).join('')
}

function addFilenameSuffix(filename: string) {
  const extensionIndex = filename.lastIndexOf('.')

  if (extensionIndex <= 0 || extensionIndex === filename.length - 1) {
    return `${filename}-${getRandomHex()}`
  }

  return `${filename.slice(0, extensionIndex)}-${getRandomHex()}${filename.slice(extensionIndex)}`
}

function sanitizePrefix(prefix: string) {
  let decodedPrefix: string

  try {
    decodedPrefix = decodeURIComponent(prefix)
  } catch {
    return ''
  }

  if (/%[0-9a-f]{2}/i.test(decodedPrefix)) {
    return ''
  }

  return decodedPrefix
    .replace(/\\/g, '/')
    .split('/')
    .filter((segment) => segment !== '..' && segment !== '.')
    .join('/')
    .replace(/^\/+/, '')
    .replace(/[\x00-\x1f\x80-\x9f]/g, '')
}

function joinPath(...segments: string[]) {
  return segments.filter(Boolean).join('/').replace(/\/+/g, '/')
}

function getFileKey({
  collectionPrefix,
  docPrefix,
  filename,
  useCompositePrefixes = false,
}: {
  collectionPrefix?: string
  docPrefix?: string
  filename: string
  useCompositePrefixes?: boolean
}) {
  const safeCollectionPrefix = sanitizePrefix(collectionPrefix || '')
  const safeDocPrefix = sanitizePrefix(docPrefix || '')
  const safeFilename = sanitizeFilename(filename)
  const fileKey = useCompositePrefixes
    ? joinPath(safeCollectionPrefix, safeDocPrefix, safeFilename)
    : joinPath(safeDocPrefix || safeCollectionPrefix, safeFilename)

  return {
    fileKey,
    sanitizedDocPrefix: safeDocPrefix,
  }
}

export function MediaClientUploadHandler({
  children,
}: MediaClientUploadHandlerProps) {
  const { setUploadHandler } = useUploadHandlers()
  const {
    config: {
      routes: { api: apiRoute },
      serverURL,
    },
  } = useConfig()

  const initializeHandler = useEffectEvent(() => {
    setUploadHandler({
      collectionSlug,
      handler: async ({ docPrefix, file, updateFilename }) => {
        const randomizedFilename = addFilenameSuffix(file.name)
        const endpointRoute = formatAdminURL({
          apiRoute,
          path: serverHandlerPath,
          serverURL,
        })
        const { fileKey: pathname, sanitizedDocPrefix } = getFileKey({
          docPrefix,
          filename: randomizedFilename,
        })

        const result = await upload(pathname, file, {
          access: 'public',
          clientPayload: collectionSlug,
          contentType: file.type,
          handleUploadUrl: endpointRoute,
        })

        updateFilename(decodeURIComponent(result.pathname.replace(/^.*\//, '')))

        return { prefix: sanitizedDocPrefix }
      },
    })
  })

  useEffect(() => {
    initializeHandler()
  }, [initializeHandler])

  return <Fragment>{children}</Fragment>
}
