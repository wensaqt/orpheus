import type { CollectionBeforeValidateHook } from 'payload'

// Before validation, since owner is required: the owner is always the user who creates it,
// never a submitted value
export const setOwnerOnCreate: CollectionBeforeValidateHook = ({ data, operation, req }) => {
  if (operation === 'create' && data && req.user) data.owner = req.user.id
  return data
}
