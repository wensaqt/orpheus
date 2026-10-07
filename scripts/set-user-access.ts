/*
 * Sets an account's role or plan from the command line, e.g. to make an existing account the
 * admin, or to grant Pro by hand until payments exist.
 *
 *   pnpm users:set someone@example.com role admin
 *   pnpm users:set someone@example.com plan pro
 */
import { getPayload } from 'payload'

import config from '@payload-config'
import { isOneOf } from '@/lib/guards'
import { PLANS, USER_ROLES } from '@/lib/users'

const [email, field, value] = process.argv.slice(2)
const data =
  field === 'role' && isOneOf(USER_ROLES, value)
    ? { role: value }
    : field === 'plan' && isOneOf(PLANS, value)
      ? { plan: value }
      : null
if (!email || !data) {
  console.error('Usage: pnpm users:set <email> role <admin|user> | plan <free|pro>')
  process.exit(1)
}

const payload = await getPayload({ config })
const { docs } = await payload.update({
  collection: 'users',
  where: { email: { equals: email } },
  data,
  depth: 0,
})
if (!docs.length) {
  console.error(`No account for ${email}`)
  process.exit(1)
}
console.log(`${email}: ${field} = ${value}`)
process.exit(0)
