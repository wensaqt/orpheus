// Fail before opening a production connection; never include secret values in diagnostics.
for (const key of ['DATABASE_URL', 'PAYLOAD_SECRET', 'APP_URL']) {
  if (!process.env[key]?.trim()) throw new Error(`Missing configuration: ${key}`)
}
if (process.env.PAYLOAD_SECRET.length < 32) throw new Error('PAYLOAD_SECRET is too short.')
function parseUrl(value, name) {
  try {
    return new URL(value)
  } catch {
    throw new Error(`${name} must be a valid URL.`)
  }
}

const database = parseUrl(process.env.DATABASE_URL, 'DATABASE_URL')
if (!['postgres:', 'postgresql:'].includes(database.protocol))
  throw new Error('DATABASE_URL must be a PostgreSQL URL.')
if (parseUrl(process.env.APP_URL, 'APP_URL').protocol !== 'https:')
  throw new Error('APP_URL must use HTTPS.')
console.log('Database initialization configuration is present.')
