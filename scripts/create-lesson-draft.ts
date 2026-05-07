import dotenv from 'dotenv'
import { getPayload } from 'payload'

import { SEASON_OPTIONS } from '../src/lib/liturgical-themes'

dotenv.config({ path: '.env.local' })
dotenv.config()

const { default: config } = await import('../src/payload.config.js')

type Options = {
  date?: string
  help: boolean
  lectionaryYear?: 'A' | 'B' | 'C'
  season?: string
  slug?: string
  title?: string
  write: boolean
}

const usage = `Usage:
  pnpm lesson:create-draft -- --date 2026-05-03 --title "Fifth Sunday of Easter" --season easter --year A
  pnpm lesson:create-draft -- --write --date 2026-05-03 --title "Fifth Sunday of Easter" --season easter --year A
  pnpm lesson:create-draft -- --write --date 2026-05-03 --title "Year A Fifth Sunday of Easter" --season easter --year A --slug 2026-05-03-year-a-fifth-sunday-of-easter

Creates a Payload lesson record with status=draft. Default mode is a dry run.
`

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

function readFlagValue(args: string[], index: number, flag: string) {
  const value = args[index + 1]

  if (!value || value.startsWith('--')) {
    throw new Error(`${flag} requires a value.`)
  }

  return value
}

function parseArgs(args: string[]): Options {
  const options: Options = { help: false, write: false }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]

    if (arg === '--') {
      continue
    }

    const [flag, inlineValue] = arg.split('=')
    const getValue = () => inlineValue ?? readFlagValue(args, index++, flag)

    switch (flag) {
      case '--date':
        options.date = getValue()
        break
      case '--help':
      case '-h':
        options.help = true
        break
      case '--season':
        options.season = getValue()
        break
      case '--slug':
        options.slug = getValue()
        break
      case '--title':
        options.title = getValue()
        break
      case '--write':
        options.write = true
        break
      case '--year': {
        const value = getValue()
        if (!['A', 'B', 'C'].includes(value)) {
          throw new Error('--year must be A, B, or C.')
        }
        options.lectionaryYear = value as 'A' | 'B' | 'C'
        break
      }
      default:
        throw new Error(`Unknown option: ${flag}`)
    }
  }

  return options
}

function requireDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('--date is required in YYYY-MM-DD format.')
  }

  return value
}

function requireTitle(value: string | undefined) {
  if (!value?.trim()) {
    throw new Error('--title is required.')
  }

  return value.trim()
}

function requireSeason(value: string | undefined) {
  const allowed = new Set(SEASON_OPTIONS.map((option) => option.value))

  if (!value || !allowed.has(value as never)) {
    throw new Error(`--season is required. Allowed: ${[...allowed].join(', ')}`)
  }

  return value as (typeof SEASON_OPTIONS)[number]['value']
}

async function main() {
  const options = parseArgs(process.argv.slice(2))

  if (options.help) {
    console.log(usage)
    return
  }

  const date = requireDate(options.date)
  const title = requireTitle(options.title)
  const liturgicalSeason = requireSeason(options.season)
  const slug = options.slug?.trim() || slugify([date, title].join(' '))

  const data = {
    date,
    lectionaryYear: options.lectionaryYear,
    liturgicalSeason,
    slug,
    status: 'draft' as const,
    title,
  }

  const lessonUrl = `https://lectionarylessons.org/lessons/${slug}`

  if (!options.write) {
    console.log('Dry run. Add --write to create this draft lesson.\n')
    console.log(JSON.stringify(data, null, 2))
    console.log(`\nFuture public URL after publish: ${lessonUrl}`)
    return
  }

  const payload = await getPayload({ config })
  const existing = await payload.find({
    collection: 'lessons',
    depth: 0,
    limit: 1,
    where: { slug: { equals: slug } },
  })

  if (existing.docs[0]) {
    const lesson = existing.docs[0]
    console.log(`Lesson already exists: ${lesson.title}`)
    console.log(`Status: ${lesson.status}`)
    console.log(`Future/public URL: ${lessonUrl}`)
    return
  }

  const lesson = await payload.create({
    collection: 'lessons',
    data,
    depth: 0,
    overrideAccess: true,
  })

  console.log(`Created draft lesson: ${lesson.title}`)
  console.log(`Slug: ${lesson.slug}`)
  console.log(`Future/public URL after publish: ${lessonUrl}`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
