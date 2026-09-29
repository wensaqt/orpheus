import type { Access, CollectionConfig } from 'payload'

import { DEFAULT_PAGE_FORMAT, DEFAULT_PAGE_MARGIN, PAGE_FORMATS } from '../lib/pageFormats'

export const DEFAULT_COMPOSITION_TITLE = 'Untitled composition'

// Chaque utilisateur ne voit et ne modifie que ses propres compositions
const ownCompositions: Access = ({ req: { user } }) => {
  if (!user) return false
  return { owner: { equals: user.id } }
}

const margin = (name: 'top' | 'right' | 'bottom' | 'left') => ({
  name,
  type: 'number' as const,
  min: 0,
  defaultValue: DEFAULT_PAGE_MARGIN,
  admin: { width: '25%' },
})

export const Compositions: CollectionConfig = {
  slug: 'compositions',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'updatedAt'],
  },
  access: {
    create: ({ req: { user } }) => Boolean(user),
    read: ownCompositions,
    update: ownCompositions,
    delete: ownCompositions,
  },
  hooks: {
    // Avant la validation, car owner est requis : le propriétaire est toujours l'auteur de la
    // création, jamais une valeur envoyée
    beforeValidate: [
      ({ data, operation, req }) => {
        if (operation === 'create' && data && req.user) data.owner = req.user.id
        return data
      },
    ],
  },
  fields: [
    { name: 'title', type: 'text', required: true, defaultValue: DEFAULT_COMPOSITION_TITLE },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      access: { update: () => false },
      admin: { readOnly: true, position: 'sidebar' },
    },
    // État Lexical sérialisé : JSON libre tant que le format de l'éditeur évolue
    { name: 'content', type: 'json' },
    {
      name: 'page',
      type: 'group',
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'format',
              type: 'select',
              required: true,
              defaultValue: DEFAULT_PAGE_FORMAT,
              options: Object.keys(PAGE_FORMATS),
            },
            {
              name: 'orientation',
              type: 'select',
              required: true,
              defaultValue: 'portrait',
              options: ['portrait', 'landscape'],
            },
          ],
        },
        {
          name: 'margins',
          type: 'group',
          admin: { description: 'En millimètres' },
          fields: [
            {
              type: 'row',
              fields: [margin('top'), margin('right'), margin('bottom'), margin('left')],
            },
          ],
        },
      ],
    },
  ],
  timestamps: true,
}
