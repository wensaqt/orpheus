import { getPayload, type Payload } from 'payload'

import config from '@payload-config'

// All test accounts share this prefix so they can always be found and deleted
export const TEST_EMAIL_PREFIX = 'orpheus-test-'
export const TEST_PASSWORD = 'orpheus-test-password'

export const getTestPayload = () => getPayload({ config })

export async function createTestUser(payload: Payload, name: string) {
  const email = `${TEST_EMAIL_PREFIX}${name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`
  return payload.create({ collection: 'users', data: { email, password: TEST_PASSWORD } })
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
