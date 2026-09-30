import type { CollectionBeforeValidateHook } from 'payload'

// Avant la validation, car owner est requis : le propriétaire est toujours l'auteur de la
// création, jamais une valeur envoyée
export const setOwnerOnCreate: CollectionBeforeValidateHook = ({ data, operation, req }) => {
  if (operation === 'create' && data && req.user) data.owner = req.user.id
  return data
}
