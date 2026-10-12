const url = new URL('/api/health', process.env.DEPLOYMENT_URL)
if (url.protocol !== 'https:') throw new Error('Deployment URL must use HTTPS.')
const headers = process.env.VERCEL_PROTECTION_BYPASS
  ? { 'x-vercel-protection-bypass': process.env.VERCEL_PROTECTION_BYPASS }
  : {}
const response = await fetch(url, {
  headers,
  redirect: 'error',
  signal: AbortSignal.timeout(30_000),
})
if (!response.ok || (await response.json()).status !== 'ok')
  throw new Error('Candidate deployment is not ready; domain promotion canceled.')
console.log('Candidate application and database are ready.')
