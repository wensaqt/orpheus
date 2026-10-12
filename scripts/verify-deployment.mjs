for (const key of [
  'VERCEL_ORG_ID',
  'VERCEL_PROJECT_ID',
  'VERCEL_TOKEN',
  'DATABASE_URL',
  'PAYLOAD_SECRET',
  'APP_URL',
  'BACKUP_PASSPHRASE',
]) {
  if (!process.env[key]?.trim()) throw new Error(`Missing deployment configuration: ${key}`)
}
if (process.env.PAYLOAD_SECRET.length < 32) throw new Error('PAYLOAD_SECRET is too short.')
if (process.env.BACKUP_PASSPHRASE.length < 32) throw new Error('BACKUP_PASSPHRASE is too short.')
if (new URL(process.env.APP_URL).protocol !== 'https:')
  throw new Error('The production APP_URL must use HTTPS.')
console.log('Deployment configuration is present; secret values are not logged.')
