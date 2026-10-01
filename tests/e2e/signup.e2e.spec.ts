import { expect, test, type Page } from '@playwright/test'

import { getTestPayload, TEST_EMAIL_PREFIX } from '../helpers/testUsers'

const newEmail = () =>
  `${TEST_EMAIL_PREFIX}signup-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`

async function signUp(page: Page, email: string, password: string, confirm = password) {
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByLabel('Confirm password').fill(confirm)
  await page.getByRole('button', { name: 'Create account' }).click()
}

test.describe('Sign-up', () => {
  // Accounts created through the form; the global setup also removes any left by a crash
  test.afterEach(async () => {
    const payload = await getTestPayload()
    const { docs } = await payload.find({
      collection: 'users',
      where: { email: { like: `${TEST_EMAIL_PREFIX}signup-` } },
      depth: 0,
    })
    for (const doc of docs) {
      await payload.delete({ collection: 'users', id: doc.id })
    }
  })

  test('creates an account, signs it in and goes back to the page asked for', async ({ page }) => {
    await page.goto('/compositions')
    await page.getByRole('link', { name: 'Create one' }).click()
    await expect(page).toHaveURL(/\/signup\?redirect=%2Fcompositions$/)
    await expect(page).toHaveTitle('Create an Orpheus account')

    await signUp(page, newEmail(), 'eurydice-forever')
    await expect(page).toHaveURL(/\/compositions$/)
    await expect(page.getByRole('heading', { name: 'All compositions' })).toBeVisible()
  })

  test('explains what to fix, keeping the email', async ({ page }) => {
    const email = newEmail()
    await page.goto('/signup')
    const alert = page.getByRole('main').getByRole('alert')

    await signUp(page, email, 'lyre')
    await expect(alert).toHaveText('Use at least 8 characters for the password.')
    await expect(page.getByLabel('Email')).toHaveValue(email)

    await signUp(page, email, 'eurydice-forever', 'eurydice-never')
    await expect(alert).toHaveText('The passwords do not match.')
  })

  test('refuses an email that already has an account', async ({ page }) => {
    const email = newEmail()
    await page.goto('/signup')
    await signUp(page, email, 'eurydice-forever')
    await expect(page).toHaveURL(/localhost:3000\/$/)

    await page.context().clearCookies()
    await page.goto('/signup')
    await signUp(page, email.toUpperCase(), 'eurydice-forever')
    await expect(page.getByRole('main').getByRole('alert')).toHaveText(
      'An account already exists for this email.',
    )
  })
})
