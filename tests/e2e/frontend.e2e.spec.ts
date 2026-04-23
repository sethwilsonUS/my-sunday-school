import { test, expect, Page } from '@playwright/test'

test.describe('Frontend', () => {
  let _page: Page

  test.beforeAll(async ({ browser }, _testInfo) => {
    const context = await browser.newContext()
    _page = await context.newPage()
  })

  test('can go on homepage', async ({ page }) => {
    await page.goto('http://localhost:3000')

    await expect(page).toHaveTitle(/Lectionary Lessons/)

    const heading = page.locator('h1').first()

    await expect(heading).toHaveText(
      'Scripture, art, study questions, and musings for the Revised Common Lectionary.',
    )
  })
})
