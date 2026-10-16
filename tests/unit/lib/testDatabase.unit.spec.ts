import { describe, expect, it } from 'vitest'
import { testDatabaseUrl } from '../../helpers/testDatabase'

describe('test database isolation', () => {
  it('requires an explicit test target instead of borrowing the application connection', () => {
    expect(() => testDatabaseUrl({ DATABASE_URL: 'postgres://localhost/application' })).toThrow(
      'TEST_DATABASE_URL is required',
    )
  })

  it.each([
    'postgres://localhost/orpheus',
    'postgres://production.example/orpheus_test',
    'https://localhost/orpheus_test',
  ])('refuses a non-disposable target', (TEST_DATABASE_URL) => {
    expect(() => testDatabaseUrl({ TEST_DATABASE_URL })).toThrow('localhost')
  })

  it.each(['postgres://localhost/orpheus_test', 'postgresql://127.0.0.1/orpheus_ci'])(
    'accepts an explicit local test database',
    (TEST_DATABASE_URL) => {
      expect(testDatabaseUrl({ TEST_DATABASE_URL })).toBe(TEST_DATABASE_URL)
    },
  )
})
