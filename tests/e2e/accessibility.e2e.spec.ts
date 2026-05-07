import AxeBuilder from '@axe-core/playwright'
import { Buffer } from 'node:buffer'
import { expect, test, type Page } from '@playwright/test'
import { getPayload } from 'payload'

import { login } from '../helpers/login'
import '../helpers/loadEnv'
import config from '../../src/payload.config.js'

const serverURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'

const auditUser = {
  email: 'accessibility-audit@payloadcms.com',
  password: 'test',
}

const auditMedia = {
  altText: 'Small test image used for artwork lightbox accessibility checks',
  filename: '__e2e-accessibility-audit-artwork.png',
  mimeType: 'image/png',
} as const

const auditLesson = {
  collect: 'Grant us patience, courage, and a strong enough focus ring for the road ahead.',
  date: '2026-04-23',
  lectionaryYear: 'C',
  liturgicalSeason: 'easter',
  musings: [
    {
      author: 'Seth Wilson',
      body: '# Grace at the shore\n\nA short reflection with a nested heading.',
      title: 'Breakfast by the water',
    },
  ],
  slug: '2026-04-23-accessibility-audit-test',
  status: 'published',
  studyQuestions: [
    {
      question: 'Where does the page invite readers to pause, listen, and respond?',
    },
  ],
  title: 'Accessibility Audit Test Lesson',
} as const

const testImageBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
  'base64',
)

type ContrastPair = {
  background: string
  foreground: string
  label: string
  minRatio: number
}

const hexToRgb = (value: string) => {
  const hex = value.trim().replace('#', '')

  if (!/^[0-9a-f]{6}$/i.test(hex)) {
    throw new Error(`Expected a six-digit hex color, received ${value}`)
  }

  return [0, 2, 4].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255)
}

const relativeLuminance = (value: string) => {
  const [red, green, blue] = hexToRgb(value).map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4),
  )

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

const contrastRatio = (foreground: string, background: string) => {
  const foregroundLuminance = relativeLuminance(foreground)
  const backgroundLuminance = relativeLuminance(background)
  const lighter = Math.max(foregroundLuminance, backgroundLuminance)
  const darker = Math.min(foregroundLuminance, backgroundLuminance)

  return (lighter + 0.05) / (darker + 0.05)
}

const getCSSVariables = async (page: Page, names: string[]) =>
  page.evaluate((variableNames) => {
    const styles = getComputedStyle(document.documentElement)

    return Object.fromEntries(
      variableNames.map((name) => [name, styles.getPropertyValue(name).trim()]),
    )
  }, names)

const expectContrastPairs = (pairs: ContrastPair[]) => {
  const failures = pairs
    .map((pair) => ({
      ...pair,
      ratio: contrastRatio(pair.foreground, pair.background),
    }))
    .filter((pair) => pair.ratio < pair.minRatio)

  expect(
    failures.map((pair) => `${pair.label}: ${pair.ratio.toFixed(2)} < ${pair.minRatio}`),
  ).toEqual([])
}

const expectNoAxeViolations = async (page: Page, include?: string) => {
  const builder = new AxeBuilder({ page }).withTags([
    'wcag2a',
    'wcag2aa',
    'wcag21a',
    'wcag21aa',
    'wcag22aa',
  ])

  if (include) {
    builder.include(include)
  }

  const results = await builder.analyze()

  expect(
    results.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.map((node) => node.target.join(' ')),
    })),
  ).toEqual([])
}

const cleanupAuditData = async () => {
  const payload = await getPayload({ config })

  await payload.delete({
    collection: 'lessons',
    where: {
      slug: {
        equals: auditLesson.slug,
      },
    },
  })

  await payload.delete({
    collection: 'media',
    where: {
      filename: {
        equals: auditMedia.filename,
      },
    },
  })

  await payload.delete({
    collection: 'users',
    where: {
      email: {
        equals: auditUser.email,
      },
    },
  })
}

const seedAuditData = async () => {
  const payload = await getPayload({ config })

  await cleanupAuditData()

  await payload.create({
    collection: 'users',
    data: auditUser,
  })

  const media = await payload.create({
    collection: 'media',
    data: auditMedia,
    file: {
      data: testImageBuffer,
      mimetype: auditMedia.mimeType,
      name: auditMedia.filename,
      size: testImageBuffer.byteLength,
    },
    overwriteExistingFiles: true,
  })

  await payload.create({
    collection: 'lessons',
    data: {
      collect: auditLesson.collect,
      date: auditLesson.date,
      lectionaryYear: auditLesson.lectionaryYear,
      liturgicalSeason: auditLesson.liturgicalSeason,
      musings: auditLesson.musings.map((musing) => ({ ...musing })),
      slug: auditLesson.slug,
      status: auditLesson.status,
      studyQuestions: auditLesson.studyQuestions.map((question) => ({ ...question })),
      title: auditLesson.title,
      artworks: [
        {
          image: media.id,
        },
      ],
    },
  })
}

test.describe('Accessibility UX', () => {
  test.beforeAll(async () => {
    test.setTimeout(90_000)
    await seedAuditData()
  })

  test.afterAll(async () => {
    test.setTimeout(90_000)
    await cleanupAuditData()
  })

  test('keeps public pages landmarked and free of automated WCAG violations', async ({ page }) => {
    for (const path of ['/', '/lessons', `/lessons/${auditLesson.slug}`]) {
      await page.goto(`${serverURL}${path}`)

      await expect(page.locator('main#main-content')).toHaveCount(1)
      await expect(page.locator('h1')).toHaveCount(1)
      await expectNoAxeViolations(page)
    }

    await page.goto(`${serverURL}/lessons/${auditLesson.slug}`)

    await expect(page.getByRole('heading', { level: 4, name: 'Grace at the shore' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: 'Grace at the shore' })).toHaveCount(0)
  })

  test('supports keyboard bypass and Escape from the artwork lightbox', async ({ page }) => {
    await page.goto(`${serverURL}/lessons/${auditLesson.slug}`)

    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused()

    await page.keyboard.press('Enter')
    await expect(page.locator('#main-content')).toBeFocused()

    const trigger = page.getByRole('button', { name: /View larger image/i })

    await trigger.focus()
    await page.keyboard.press('Enter')

    const dialog = page.getByRole('dialog', { name: /Larger image/i })

    await expect(dialog).toBeVisible()
    await expect(page.getByRole('button', { name: 'Close image viewer' })).toBeFocused()

    await page.keyboard.press('Escape')

    await expect(dialog).not.toBeVisible()
    await expect(trigger).toBeFocused()
  })

  test('keeps public and admin color tokens above WCAG contrast floors', async ({ page }) => {
    await page.goto(`${serverURL}/`)

    for (const theme of ['light', 'dark']) {
      await page.evaluate((nextTheme) => {
        document.documentElement.setAttribute('data-theme', nextTheme)
      }, theme)

      const tokens = await getCSSVariables(page, [
        '--background',
        '--border',
        '--foreground',
        '--link',
        '--ring',
        '--surface',
      ])

      expectContrastPairs([
        {
          background: tokens['--background'],
          foreground: tokens['--border'],
          label: `public ${theme} border on background`,
          minRatio: 3,
        },
        {
          background: tokens['--surface'],
          foreground: tokens['--border'],
          label: `public ${theme} border on surface`,
          minRatio: 3,
        },
        {
          background: tokens['--background'],
          foreground: tokens['--ring'],
          label: `public ${theme} focus ring on background`,
          minRatio: 3,
        },
        {
          background: tokens['--background'],
          foreground: tokens['--link'],
          label: `public ${theme} link on background`,
          minRatio: 4.5,
        },
      ])
    }

    await page.goto(`${serverURL}/admin/login`)

    for (const theme of ['light', 'dark']) {
      await page.evaluate((nextTheme) => {
        document.documentElement.setAttribute('data-theme', nextTheme)
      }, theme)

      const tokens = await getCSSVariables(page, [
        '--admin-accent',
        '--admin-border',
        '--admin-muted',
        '--theme-bg',
        '--theme-input-bg',
      ])

      expectContrastPairs([
        {
          background: tokens['--theme-bg'],
          foreground: tokens['--admin-border'],
          label: `admin ${theme} border on background`,
          minRatio: 3,
        },
        {
          background: tokens['--theme-input-bg'],
          foreground: tokens['--admin-border'],
          label: `admin ${theme} border on input`,
          minRatio: 3,
        },
        {
          background: tokens['--theme-bg'],
          foreground: tokens['--admin-accent'],
          label: `admin ${theme} focus accent on background`,
          minRatio: 3,
        },
        {
          background: tokens['--theme-bg'],
          foreground: tokens['--admin-muted'],
          label: `admin ${theme} muted text on background`,
          minRatio: 4.5,
        },
      ])
    }
  })

  test('keeps custom Payload admin guidance announced and keyboard visible', async ({ page }) => {
    await page.goto(`${serverURL}/admin/login`)
    await expectNoAxeViolations(page, '.admin-branding-card')

    await login({ page, user: auditUser })

    await expectNoAxeViolations(page, '.admin-branding-card')

    const openLessons = page.getByRole('link', { name: 'Open Lessons' })

    for (let index = 0; index < 30; index += 1) {
      if (await openLessons.evaluate((element) => document.activeElement === element)) {
        break
      }

      await page.keyboard.press('Tab')
    }

    await expect(openLessons).toBeFocused()

    const outlineStyle = await openLessons.evaluate(
      (element) => getComputedStyle(element).outlineStyle,
    )

    expect(outlineStyle).not.toBe('none')

    await page.goto(`${serverURL}/admin/collections/lessons/create`)

    await expect(
      page.locator('[role="status"]').filter({ hasText: 'Save this lesson' }),
    ).toBeVisible()
  })
})
