import { getPayload } from 'payload'
import { Buffer } from 'node:buffer'

import './loadEnv'
import config from '../../src/payload.config.js'

export const testMedia = {
  altText: 'Admin artwork relationship smoke test',
  filename: '__e2e-admin-artwork-relationship-smoke-test.png',
  mimeType: 'image/png',
} as const

const testImageBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
  'base64',
)

const deleteMediaByFilename = async (filename: string) => {
  const payload = await getPayload({ config })

  await payload.delete({
    collection: 'media',
    where: {
      filename: {
        equals: filename,
      },
    },
  })
}

export async function seedTestMedia() {
  const payload = await getPayload({ config })

  await deleteMediaByFilename(testMedia.filename)

  return payload.create({
    collection: 'media',
    data: testMedia,
    file: {
      data: testImageBuffer,
      mimetype: testMedia.mimeType,
      name: testMedia.filename,
      size: testImageBuffer.byteLength,
    },
    overwriteExistingFiles: true,
  })
}

export async function cleanupTestMedia(): Promise<void> {
  await deleteMediaByFilename(testMedia.filename)
}
