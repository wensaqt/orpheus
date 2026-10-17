import { expect, test } from '@playwright/test'

import { boxOf, sessionCookie } from './fixtures'

test.describe('Home', () => {
  test('shows both choices, the separator and the logo', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle('Orpheus')
    await expect(page.getByRole('button', { name: /New composition/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /All compositions/ })).toHaveAttribute(
      'href',
      '/compositions',
    )
    await expect(page.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
  })

  test('the hovered button’s half of the lyre appears', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto('/')
    const browse = page.getByRole('link', { name: /All compositions/ })
    const lyre = browse.locator('svg[data-side]')
    await expect(lyre).toHaveCSS('opacity', '0')
    await browse.hover()
    await expect(lyre).toHaveCSS('opacity', '1')
  })

  test('small screens show both choices and subtitles without the interactive lyre', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'A page of your own.' })).toBeVisible()
    const create = page.getByRole('button', { name: /New composition/ })
    const browse = page.getByRole('link', { name: /All compositions/ })
    await expect(create).toBeInViewport()
    await expect(browse).toBeInViewport()
    await expect(create.getByText('Start a new piece')).toHaveCSS('clip-path', 'none')
    await expect(browse.getByText('Revisit your pieces')).toHaveCSS('clip-path', 'none')
    await expect(create.locator('svg[data-side]')).toBeHidden()
    await expect(browse.locator('svg[data-side]')).toBeHidden()
    await expect(browse).toHaveCSS('touch-action', 'auto')
    await browse.click()
    await expect(page).toHaveURL(/\/login\?redirect=%2Fcompositions$/)
  })

  test.describe('touch tablets', () => {
    test.use({ hasTouch: true, isMobile: true })

    const layouts = [
      { name: 'portrait', width: 834, height: 1194, columns: false },
      { name: 'landscape', width: 1194, height: 834, columns: true },
      { name: 'large landscape', width: 1366, height: 1024, columns: true },
    ]

    for (const { name, width, height, columns } of layouts) {
      test(`${name} keeps both illustrated choices visible`, async ({ page }) => {
        await page.setViewportSize({ width, height })
        await page.goto('/')
        const create = page.getByRole('button', { name: /New composition/ })
        const browse = page.getByRole('link', { name: /All compositions/ })
        await expect(create).toBeInViewport({ ratio: 1 })
        await expect(browse).toBeInViewport({ ratio: 1 })
        await expect(create.locator('svg[data-side]')).toBeHidden()
        await expect(browse.locator('svg[data-side]')).toBeHidden()
        await expect(create.getByText('Start a new piece')).toHaveCSS('clip-path', 'none')
        await expect(browse.getByText('Revisit your pieces')).toHaveCSS('clip-path', 'none')
        const first = await boxOf(create)
        const second = await boxOf(browse)
        if (columns) {
          expect(first.y).toBe(second.y)
          expect(first.x + first.width).toBeLessThan(second.x)
          expect(Math.abs(first.width - second.width)).toBeLessThan(1)
        } else {
          expect(first.y + first.height).toBeLessThan(second.y)
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
          width,
        )
      })
    }
  })

  test('composition pages require login', async ({ page }) => {
    await page.goto('/compositions')
    await expect(page).toHaveURL(/^[^?]+\/\/[^/]+\/login\?redirect=%2Fcompositions$/)
  })

  test('an invalid session cookie passes the proxy but is stopped by the page guard', async ({
    page,
    baseURL,
  }) => {
    await page.context().addCookies([sessionCookie('forged', baseURL)])
    await page.goto('/compositions')
    await expect(page).toHaveURL(/^[^?]+\/\/[^/]+\/login\?redirect=%2Fcompositions$/)
  })
})
