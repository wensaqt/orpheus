import { expect, test } from '@playwright/test'

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
    await page.goto('/')
    const browse = page.getByRole('link', { name: /All compositions/ })
    const lyre = browse.locator('svg')
    await expect(lyre).toHaveCSS('opacity', '0')
    await browse.hover()
    await expect(lyre).toHaveCSS('opacity', '1')
  })

  test('composition pages require login', async ({ page }) => {
    await page.goto('/compositions')
    await expect(page).toHaveURL(/\/admin\/login\?redirect=%2Fcompositions/)
  })
})
