import type { Access } from 'payload'

import { relationId } from '@/lib/relationId'

// Each user can only see and change the items of their own binders
export const ownBinderItems: Access = ({ req: { user } }) => {
  if (!user) return false
  return { owner: { equals: user.id } }
}

// An item can only be added to a composition the user owns
export const canAddToComposition: Access = async ({ req, data }) => {
  if (!req.user) return false
  const composition = relationId(data?.composition)
  if (composition === null) return false
  const { totalDocs } = await req.payload.count({
    collection: 'compositions',
    where: { and: [{ id: { equals: composition } }, { owner: { equals: req.user.id } }] },
    req,
  })
  return totalDocs > 0
}
