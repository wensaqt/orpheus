import { getPayload, type Payload } from 'payload'

import type { UserRole } from '@/lib/users'
import { configureTestDatabase } from './testDatabase'

// All test accounts share this prefix so they can always be found and deleted
export const TEST_EMAIL_PREFIX = 'orpheus-test-'
// Must pass the password rules: long enough, without the app's name
export const TEST_PASSWORD = 'lyre-of-thrace-42'

export async function getTestPayload() {
  configureTestDatabase()
  const { default: config } = await import('@payload-config')
  return getPayload({ config })
}

/*
 * A temporary account with the given role, explicitly granted through the trusted Local API.
 */
export async function createTestUser(payload: Payload, name: string, role: UserRole = 'user') {
  const email = `${TEST_EMAIL_PREFIX}${name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`
  const user = await payload.create({
    collection: 'users',
    data: { email, password: TEST_PASSWORD },
  })
  return user.role === role
    ? user
    : payload.update({ collection: 'users', id: user.id, data: { role } })
}

// Deletes test accounts and their compositions (including those from an interrupted run)
export async function cleanupTestUsers(payload: Payload) {
  const { docs } = await payload.find({
    collection: 'users',
    where: { email: { like: TEST_EMAIL_PREFIX } },
    pagination: false,
    depth: 0,
  })
  const ids = docs.map((user) => user.id)
  if (!ids.length) return
  await payload.delete({ collection: 'compositions', where: { owner: { in: ids } } })
  await payload.delete({ collection: 'users', where: { id: { in: ids } } })
}
