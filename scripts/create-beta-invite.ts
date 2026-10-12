import { getPayload } from 'payload'
import config from '@payload-config'
import { newInvitation } from '@/lib/betaInvitations'

// Run privately, then copy the one-time URL into an email sent from your own mailbox.
const email = process.env.BETA_INVITE_EMAIL?.trim()
const origin = process.env.APP_URL
if (!email || !origin)
  throw new Error('Set BETA_INVITE_EMAIL and APP_URL in the private environment.')
const url = new URL('/signup', origin)
if (url.protocol !== 'https:') throw new Error('Invitation links require an HTTPS application URL.')
const payload = await getPayload({ config })
try {
  const { totalDocs } = await payload.count({
    collection: 'users',
    where: { email: { equals: email.toLowerCase() } },
  })
  if (totalDocs) throw new Error('This email already has an account.')
  const invitation = newInvitation(email)
  await payload.create({
    collection: 'beta-invitations',
    data: invitation.data,
    overrideAccess: true,
  })
  url.searchParams.set('invite', invitation.token)
  console.log(url.toString())
} finally {
  await payload.destroy()
}
