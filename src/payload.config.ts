import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig, type Plugin } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Lessons } from './collections/Lessons'
import { getMediaClientUploadRoute } from './lib/payload/mediaClientUploadRoute'
import { vercelBlobStorageWithOverwrite } from './lib/payload/vercelBlobStorageWithOverwrite'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const blobToken = process.env.BLOB_READ_WRITE_TOKEN
const hasValidBlobToken = blobToken?.startsWith('vercel_blob_rw_') ?? false
const mediaClientUploadHandler = '/components/admin/MediaClientUploadHandler#MediaClientUploadHandler'
const vercelBlobClientUploadRoute = '/vercel-blob-client-upload-route'

const mediaClientUploadPlugin = (enabled: boolean, token?: string): Plugin => {
  return (incomingConfig) => {
    const dependencies = { ...(incomingConfig.admin?.dependencies || {}) }

    return {
      ...incomingConfig,
      admin: {
        ...incomingConfig.admin,
        components: {
          ...incomingConfig.admin?.components,
          providers: enabled
            ? [...(incomingConfig.admin?.components?.providers || []), mediaClientUploadHandler]
            : incomingConfig.admin?.components?.providers,
        },
        dependencies: {
          ...dependencies,
          [mediaClientUploadHandler]: {
            path: mediaClientUploadHandler,
            type: 'function',
          },
        },
      },
      endpoints: [
        ...(incomingConfig.endpoints || []),
        ...(enabled
          ? [
              {
                handler: getMediaClientUploadRoute({ token }),
                method: 'post' as const,
                path: vercelBlobClientUploadRoute,
              },
            ]
          : []),
      ],
    }
  }
}

export default buildConfig({
  admin: {
    components: {
      beforeDashboard: ['/components/admin/DashboardStartHere#DashboardStartHere'],
      beforeLogin: ['/components/admin/LoginIntro#LoginIntro'],
      graphics: {
        Icon: '/components/admin/AdminBrand#AdminIcon',
        Logo: '/components/admin/AdminBrand#AdminLogo',
      },
    },
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Lessons],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    push: false,
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  }),
  sharp,
  plugins: [
    vercelBlobStorageWithOverwrite({
      enabled: hasValidBlobToken,
      collections: {
        media: true,
      },
      token: blobToken,
    }),
    mediaClientUploadPlugin(hasValidBlobToken, blobToken),
  ],
})
