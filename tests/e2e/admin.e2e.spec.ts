import { test, expect } from '@playwright/test'
import { login } from '../helpers/login'
import { seedTestUser, cleanupTestUser, testUser } from '../helpers/seedUser'
import { cleanupTestLesson, seedTestLesson, testLesson } from '../helpers/seedLesson'

const serverURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'

test.describe('Admin Panel', () => {
  let lessonID: number | string

  test.beforeAll(async () => {
    await seedTestUser()
    const lesson = await seedTestLesson()

    lessonID = lesson.id
  })

  test.afterAll(async () => {
    await cleanupTestLesson()
    await cleanupTestUser()
  })

  test('shows branded guidance on the login page', async ({ page }) => {
    await page.goto(`${serverURL}/admin/login`)

    await expect(page.getByRole('img', { name: 'Lectionary Lessons' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'A gentler place to build lessons' })).toBeVisible()
    await expect(
      page.getByText(
        'Lectionary Lessons editors can draft lessons, curate artwork, and publish only when everything is ready.',
      ),
    ).toBeVisible()
  })

  test('shows branded dashboard quick actions after login', async ({ page }) => {
    await login({ page, user: testUser })

    await expect(page.getByRole('link', { name: 'Open Lessons' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Open Media' })).toBeVisible()
    await expect(
      page.getByText(
        'Published lessons appear on the public site. Drafts stay tucked away in the admin until you are ready.',
      ),
    ).toBeVisible()
  })

  test('shows the lessons workflow helper in list view', async ({ page }) => {
    await login({ page, user: testUser })
    await page.goto(`${serverURL}/admin/collections/lessons`)

    await expect(page.getByRole('heading', { name: 'Draft, review, then publish' })).toBeVisible()
    await expect(
      page.getByText('Only lessons marked published appear on the public site.'),
    ).toBeVisible()
  })

  test('shows lesson tabs, collapsed sections, and a public link only when valid', async ({
    page,
  }) => {
    await login({ page, user: testUser })
    await page.goto(`${serverURL}/admin/collections/lessons/create`)

    await expect(page.getByRole('button', { name: 'Overview' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Content' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Media & Links' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Internal Notes' })).toBeVisible()
    await expect(page.getByText('Save this lesson to get a public link.')).toBeVisible()

    await page.getByRole('button', { name: 'Content' }).click()
    await expect(page.getByText('Quotations & excerpts')).toBeVisible()
    await page.getByRole('button', { name: 'Toggle block' }).click()
    await expect(page.getByRole('button', { name: 'Add Quote' })).toBeVisible()

    await page.goto(`${serverURL}/admin/collections/lessons/${lessonID}`)

    const publicLink = page.getByRole('link', { name: 'View public lesson' })
    await expect(publicLink).toBeVisible()

    const publicHref = await publicLink.getAttribute('href')

    expect(publicHref).toBeTruthy()
    expect(new URL(publicHref as string).pathname).toBe(`/lessons/${testLesson.slug}`)
  })
})
