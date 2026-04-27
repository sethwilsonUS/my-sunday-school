import { test, expect, Page } from '@playwright/test'

const serverURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'

test.describe('Frontend', () => {
  let _page: Page

  test.beforeAll(async ({ browser }, _testInfo) => {
    const context = await browser.newContext()
    _page = await context.newPage()
  })

  test('can go on homepage', async ({ page }) => {
    await page.goto(serverURL)

    await expect(page).toHaveTitle(/Lectionary Lessons/)

    const heading = page.locator('h1').first()

    await expect(heading).toHaveText(
      'Scripture, art, study questions, and musings for the Revised Common Lectionary.',
    )

    await expect(page.getByRole('link', { name: 'Browse lessons' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Open admin' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Admin' })).toHaveCount(0)
  })
})
