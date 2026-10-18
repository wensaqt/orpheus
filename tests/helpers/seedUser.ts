import { getTestPayload, TEST_EMAIL_PREFIX } from './testUsers'

export const testUser = {
  email: `${TEST_EMAIL_PREFIX}admin@example.test`,
  password: 'test-password',
}

/**
 * Seeds an admin test user for e2e admin tests (the admin panel is for admins only).
 */
export async function seedTestUser(): Promise<void> {
  const payload = await getTestPayload()

  // Delete existing test user if any
  await payload.delete({
    collection: 'users',
    where: {
      email: {
        equals: testUser.email,
      },
    },
  })

  // Create fresh test user
  await payload.create({
    collection: 'users',
    data: { ...testUser, role: 'admin' },
  })
}

/**
 * Cleans up test user after tests
 */
export async function cleanupTestUser(): Promise<void> {
  const payload = await getTestPayload()

  await payload.delete({
    collection: 'users',
    where: {
      email: {
        equals: testUser.email,
      },
    },
  })
}
