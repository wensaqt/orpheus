import { getPayload } from 'payload'

import config from '@payload-config'

// Run from a trusted machine, before exposing the beta. Passwords are never CLI arguments.
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
const password = process.env.ADMIN_PASSWORD
if (!email || !password)
  throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in the private environment.')
const payload = await getPayload({ config })
const { totalDocs } = await payload.count({
  collection: 'users',
  where: { email: { equals: email } },
})
if (totalDocs)
  throw new Error('This account already exists; use users:set for an explicit role change.')
await payload.create({
  collection: 'users',
  data: { email, password, role: 'admin' },
  overrideAccess: true,
})
console.log('Administrator created.')
await payload.destroy()
