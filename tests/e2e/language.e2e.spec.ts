import { expect as baseExpect, test as base } from '@playwright/test'

import { expect, test } from './fixtures'

base.describe('Language', () => {
  base('switching to French applies everywhere and is remembered', async ({ page }) => {
    await page.goto('/')
    const menu = page.getByRole('menu', { name: 'Language' })
    // The menu opens natively (Popover API) before React hydrates and handles the click: retry
    await baseExpect(async () => {
      await page.getByRole('button', { name: 'Language' }).click()
      await baseExpect(menu.getByRole('menuitemradio', { name: 'English' })).toHaveAttribute(
        'aria-checked',
        'true',
      )
      await menu.getByRole('menuitemradio', { name: 'Français' }).click()
      await baseExpect(page.getByRole('button', { name: /Nouvelle composition/ })).toBeVisible({
        timeout: 5_000,
      })
    }).toPass({ timeout: 15_000 })
    await baseExpect(page.locator('html')).toHaveAttribute('lang', 'fr')
    await baseExpect(page).toHaveTitle('Orpheus')

    await page.reload()
    await baseExpect(page.getByRole('link', { name: /Toutes les compositions/ })).toBeVisible()
    await page.goto('/login')
    await baseExpect(page).toHaveTitle('Se connecter à Orpheus')
  })

  base.describe('with a browser set to French', () => {
    base.use({ locale: 'fr-FR' })

    base('shows French from the first visit', async ({ page }) => {
      await page.goto('/')
      await baseExpect(page.getByRole('button', { name: /Nouvelle composition/ })).toBeVisible()
      await baseExpect(page.getByRole('button', { name: 'Langue' })).toHaveText('🇫🇷')
    })
  })
})

test.describe('Language, signed in', () => {
  test.use({ locale: 'fr-FR' })

  test('a new composition gets a French default title', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Nouvelle composition/ }).click()
    await expect(page).toHaveURL(/\/compositions\/\d+$/)
    await expect(page.getByLabel('Titre de la composition')).toHaveValue('Composition sans titre')
  })
})
