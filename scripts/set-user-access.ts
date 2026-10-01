/*
 * Sets an account's role or plan from the command line, e.g. to make an existing account the
 * admin, or to grant Pro by hand until payments exist.
 *
 *   pnpm users:set someone@example.com role admin
 *   pnpm users:set someone@example.com plan pro
 */
import { getPayload } from 'payload'

import config from '@payload-config'
import { PLANS, USER_ROLES } from '@/lib/users'

const ALLOWED = { role: USER_ROLES, plan: PLANS } as const

const [email, field, value] = process.argv.slice(2)
const allowed = ALLOWED[field as keyof typeof ALLOWED] as readonly string[] | undefined
if (!email || !allowed?.includes(value)) {
  console.error('Usage: pnpm users:set <email> role <admin|user> | plan <free|pro>')
  process.exit(1)
}

const payload = await getPayload({ config })
const { docs } = await payload.update({
  collection: 'users',
  where: { email: { equals: email } },
  data: { [field]: value },
  depth: 0,
})
if (!docs.length) {
  console.error(`No account for ${email}`)
  process.exit(1)
}
console.log(`${email}: ${field} = ${value}`)
process.exit(0)
