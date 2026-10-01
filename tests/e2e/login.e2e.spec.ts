import { expect as baseExpect, test as base, type Page } from '@playwright/test'

import { createTestUser, getTestPayload, TEST_PASSWORD } from '../helpers/testUsers'

import { expect, test } from './fixtures'

// Signs in through the form, as a visitor would
async function signIn(page: Page, email: string, password: string) {
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

base.describe('Login', () => {
  // A fresh, signed-out account per test
  const anonymous = base.extend<{ email: string }>({
    email: async ({}, use) => {
      const payload = await getTestPayload()
      const user = await createTestUser(payload, 'login')
      await use(user.email)
      await payload.delete({ collection: 'users', where: { id: { equals: user.id } } })
    },
  })

  anonymous('a wrong password is refused and the email is kept', async ({ page, email }) => {
    await page.goto('/login')
    await baseExpect(page).toHaveTitle('Sign in to Orpheus')
    await signIn(page, email, 'not-the-password')
    await baseExpect(page.getByRole('main').getByRole('alert')).toHaveText(
      'Incorrect email or password.',
    )
    await baseExpect(page.getByLabel('Email')).toHaveValue(email)
    await baseExpect(page).toHaveURL(/\/login$/)
  })

  anonymous('signing in leads back to the page that asked for it', async ({ page, email }) => {
    await page.goto('/compositions')
    await signIn(page, email, TEST_PASSWORD)
    await baseExpect(page).toHaveURL(/\/compositions$/)
    await baseExpect(page.getByRole('heading', { name: 'All compositions' })).toBeVisible()
  })

  anonymous('ignores a return address on another site', async ({ page, email }) => {
    await page.goto(`/login?redirect=${encodeURIComponent('//evil.example/phish')}`)
    await signIn(page, email, TEST_PASSWORD)
    await baseExpect(page).toHaveURL(/^http:\/\/localhost:3000\/$/)
  })
})

test.describe('Signed in', () => {
  test('the login page sends a signed-in user on', async ({ page }) => {
    await page.goto('/login?redirect=%2Fcompositions')
    await expect(page).toHaveURL(/\/compositions$/)
  })

  test('a regular account cannot use the admin panel', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.locator('span[title="Dashboard"]')).toHaveCount(0)
    await expect(page).toHaveURL(/\/admin\/unauthorized/)
  })
})
