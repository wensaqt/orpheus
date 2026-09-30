import { test as base, expect, type Page } from '@playwright/test'
import type { Payload } from 'payload'

import type { User } from '@/payload-types'

import {
  cleanupTestUsers,
  createTestUser,
  getTestPayload,
  TEST_PASSWORD,
} from '../helpers/testUsers'

export type Account = { user: User; payload: Payload }

/*
 * Each test gets a temporary, already logged-in account (session cookie set via the login API,
 * bypassing the admin form), deleted at the end of the test.
 */
export const test = base.extend<{ account: Account; page: Page }>({
  account: async ({}, use) => {
    const payload = await getTestPayload()
    const user = await createTestUser(payload, 'e2e')
    await use({ user, payload })
    await payload.delete({ collection: 'compositions', where: { owner: { equals: user.id } } })
    await payload.delete({ collection: 'users', where: { id: { equals: user.id } } })
  },
  page: async ({ page, account, baseURL }, use) => {
    const response = await page.request.post('/api/users/login', {
      data: { email: account.user.email, password: TEST_PASSWORD },
    })
    expect(response.ok()).toBe(true)
    const { token } = await response.json()
    await page.context().addCookies([{ name: 'payload-token', value: token, url: baseURL! }])
    await use(page)
  },
})

export { expect }
