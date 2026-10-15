import { expect as baseExpect, test as base } from '@playwright/test'

import {
  createTestUser,
  getTestPayload,
  TEST_EMAIL_PREFIX,
  TEST_PASSWORD,
} from '../helpers/testUsers'

import { expect, test } from './fixtures'
import { SESSION_COOKIE } from '@front/_lib/auth'
import { signIn } from './authHelpers'

base.describe('Login', () => {
  // A fresh, signed-out account per test
  const anonymous = base.extend<{ email: string }>({
    email: async ({}, runTest) => {
      const payload = await getTestPayload()
      const user = await createTestUser(payload, 'login')
      await runTest(user.email)
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
    await baseExpect(page).toHaveURL(/^https?:\/\/localhost:3000\/$/)
  })

  anonymous(
    'opens the account menu immediately after signing in from the home page',
    async ({ page, email }) => {
      await page.goto('/')
      await page.getByRole('link', { name: 'Sign in', exact: true }).click()
      await signIn(page, email, TEST_PASSWORD)
      await baseExpect(page).toHaveURL(/^https?:\/\/localhost:3000\/$/)
      await page.getByRole('button', { name: 'Account', exact: true }).click()
      await baseExpect(page.getByRole('menu', { name: 'Account', exact: true })).toBeVisible()
      await baseExpect(page.getByRole('menu', { name: 'Account', exact: true })).toContainText(
        email,
      )
    },
  )

  anonymous(
    'an administrator can generate an invitation after login without reloading',
    async ({ page, email }) => {
      const payload = await getTestPayload()
      await payload.update({
        collection: 'users',
        where: { email: { equals: email } },
        data: { role: 'admin' },
      })
      const recipient = `${TEST_EMAIL_PREFIX}invite-${Date.now()}@example.test`
      try {
        await page.goto('/')
        await page.getByRole('link', { name: 'Sign in', exact: true }).click()
        await signIn(page, email, TEST_PASSWORD)
        await baseExpect(page).toHaveURL(/^https?:\/\/localhost:3000\/$/)
        if (process.env.PLAYWRIGHT_SERVER_MODE === 'production') {
          const cookies = await page.context().cookies()
          baseExpect(
            cookies.some(
              (cookie) => cookie.name === SESSION_COOKIE && cookie.secure && cookie.httpOnly,
            ),
          ).toBe(true)
        }
        await page.getByRole('button', { name: 'Account', exact: true }).click()
        await page.getByRole('menuitem', { name: 'Beta invitations' }).click()
        await page.getByLabel('Email').fill(recipient)
        await page.getByRole('button', { name: 'Generate invitation' }).click()
        await baseExpect(page.getByLabel('Invitation link')).toHaveValue(
          /\/signup\?invite=[a-f0-9]{64}$/,
        )
      } finally {
        await payload.delete({
          collection: 'beta-invitations',
          where: { email: { equals: recipient } },
        })
      }
    },
  )
})

test.describe('Signed in', () => {
  test('the login page sends a signed-in user on', async ({ page }) => {
    await page.goto('/login?redirect=%2Fcompositions')
    await expect(page).toHaveURL(/\/compositions$/)
  })

  test('the account menu signs out, after which pages ask to sign in again', async ({
    page,
    account,
  }) => {
    await page.goto('/compositions')
    await page.getByRole('button', { name: 'Account' }).click()
    const menu = page.getByRole('menu', { name: 'Account' })
    await expect(menu).toContainText(`Signed in as ${account.user.email}`)
    await expect(menu.getByRole('menuitem', { name: 'Profile' })).toBeDisabled()

    await menu.getByRole('menuitem', { name: 'Sign out' }).click()
    await expect(page).toHaveURL(/localhost:3000\/$/)
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible()
    await page.goto('/compositions')
    await expect(page).toHaveURL(/\/login\?redirect=%2Fcompositions$/)
  })

  test('signs out of a revoked session while the account menu still looks signed in', async ({
    page,
    context,
    account,
  }) => {
    await page.goto('/compositions')
    await page.getByRole('button', { name: 'Account' }).click()
    const menu = page.getByRole('menu', { name: 'Account' })
    await expect(menu).toContainText(account.user.email)
    await account.payload.update({
      collection: 'users',
      id: account.user.id,
      data: { sessions: [] },
    })

    await menu.getByRole('menuitem', { name: 'Sign out' }).click()
    await expect(page).toHaveURL(/localhost:3000\/$/)
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible()
    expect((await context.cookies()).some(({ name }) => name === SESSION_COOKIE)).toBe(false)
    await page.goto('/compositions')
    await expect(page).toHaveURL(/\/login\?redirect=%2Fcompositions$/)
  })

  test('a regular account cannot use the admin panel', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.locator('span[title="Dashboard"]')).toHaveCount(0)
    await expect(page).toHaveURL(/\/admin\/unauthorized/)
  })
})
