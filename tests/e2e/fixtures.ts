import { test as base, expect, type Locator, type Page } from '@playwright/test'
import type { Payload } from 'payload'

import type { User } from '@/payload-types'
import { SESSION_COOKIE } from '@front/_lib/auth'

import { createTestUser, getTestPayload, TEST_PASSWORD } from '../helpers/testUsers'

export type Account = { user: User; payload: Payload }

// The session cookie Payload reads, for the app under test
export function sessionCookie(token: string, baseURL: string | undefined) {
  if (!baseURL) throw new Error('No baseURL: set it in playwright.config.ts')
  return { name: SESSION_COOKIE, value: token, url: baseURL }
}

// Where an element is on screen; the test fails here if it is not shown
export async function boxOf(locator: Locator) {
  const box = await locator.boundingBox()
  if (!box) throw new Error(`Not shown: ${locator}`)
  return box
}

// An element's text, empty if it has none
export const textOf = async (locator: Locator) => (await locator.textContent()) ?? ''

/*
 * Each test gets a temporary, already logged-in account (session cookie set via the login API,
 * bypassing the admin form), deleted at the end of the test.
 */
export const test = base.extend<{ account: Account; page: Page }>({
  account: async ({}, runTest) => {
    const payload = await getTestPayload()
    const user = await createTestUser(payload, 'e2e')
    await runTest({ user, payload })
    await payload.delete({ collection: 'compositions', where: { owner: { equals: user.id } } })
    await payload.delete({ collection: 'users', where: { id: { equals: user.id } } })
  },
  page: async ({ page, account, baseURL }, runTest) => {
    const response = await page.request.post('/api/users/login', {
      data: { email: account.user.email, password: TEST_PASSWORD },
    })
    expect(response.ok()).toBe(true)
    const { token } = await response.json()
    await page.context().addCookies([sessionCookie(token, baseURL)])
    await runTest(page)
  },
})

export { expect }
