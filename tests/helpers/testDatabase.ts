type Environment = Record<string, string | undefined>

/** Require an explicit disposable database before any fixture or Payload initialization. */
export function testDatabaseUrl(env: Environment): string {
  const value = env.TEST_DATABASE_URL
  if (!value) throw new Error('TEST_DATABASE_URL is required for database and browser tests.')
  if (!URL.canParse(value)) throw new Error('TEST_DATABASE_URL must be a valid PostgreSQL URL.')
  const url = new URL(value)
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  const dedicated = /_(?:test|ci)$/.test(url.pathname.slice(1))
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !local || !dedicated)
    throw new Error('TEST_DATABASE_URL must use localhost and a database ending in _test or _ci.')
  return value
}

export function configureTestDatabase(): void {
  process.env.DATABASE_URL = testDatabaseUrl(process.env)
  // Test schemas are initialized through migrations, never an implicit development push.
  process.env.PAYLOAD_SCHEMA_PUSH = 'false'
}
