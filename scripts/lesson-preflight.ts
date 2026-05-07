import dotenv from 'dotenv'
import { getPayload } from 'payload'

dotenv.config({ path: '.env.local' })
dotenv.config()

const { default: config } = await import('../src/payload.config.js')

async function main() {
  const payload = await getPayload({ config })

  try {
    await payload.find({
      collection: 'lessons',
      depth: 0,
      limit: 1,
      where: {
        sourceLectionaryUrl: {
          exists: true,
        },
      },
    })

    console.log('Payload preflight OK: lessons.source_lectionary_url is available.')
  } catch (error) {
    if (isMissingSourceLectionaryUrlColumn(error)) {
      throw new Error(
        'The lessons.sourceLectionaryUrl column is missing. Run the generated Payload migration before lesson:sync can match by source URL/date.',
      )
    }

    throw error
  } finally {
    await payload.destroy()
  }
}

function isMissingSourceLectionaryUrlColumn(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return /source_lectionary_url/i.test(message)
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => {
    process.exit(process.exitCode ?? 0)
  })
