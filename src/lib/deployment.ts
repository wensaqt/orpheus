type Environment = Record<string, string | undefined>

function required(env: Environment, key: string): string {
  const value = env[key]?.trim()
  if (!value) throw new Error(`${key} is required.`)
  return value
}

function applicationOrigin(env: Environment): string | undefined {
  const value = env.APP_URL || (env.VERCEL_URL ? `https://${env.VERCEL_URL}` : undefined)
  if (!value) return undefined
  const url = new URL(value)
  if (
    url.protocol !== 'https:' &&
    !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))
  )
    throw new Error('APP_URL must use HTTPS, except on localhost.')
  return url.origin
}

export function deploymentConfig(env: Environment) {
  const production = env.NODE_ENV === 'production'
  const secret = required(env, 'PAYLOAD_SECRET')
  if (production && secret.length < 32)
    throw new Error('PAYLOAD_SECRET must contain at least 32 characters in production.')
  const databaseUrl = required(env, 'DATABASE_URL')
  if (!['postgres:', 'postgresql:'].includes(new URL(databaseUrl).protocol))
    throw new Error('DATABASE_URL must be a PostgreSQL URL.')
  const origin = applicationOrigin(env)
  if (production && !origin) throw new Error('APP_URL or VERCEL_URL is required in production.')
  return { production, secret, databaseUrl, origin }
}
