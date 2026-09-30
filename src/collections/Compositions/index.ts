import type { CollectionConfig } from 'payload'

import { isLoggedIn } from '@/access/isLoggedIn'
import {
  DEFAULT_COMPOSITION_TITLE,
  LEXICAL_STATE_JSON_SCHEMA,
  MAX_COMPOSITION_TITLE_LENGTH,
} from '@/lib/compositions'
import { DEFAULT_PAGE_FORMAT, DEFAULT_PAGE_MARGIN, PAGE_FORMATS } from '@/lib/pageFormats'

import { ownCompositions } from './access'
import { setOwnerOnCreate } from './hooks'
import { validateTitle } from './validators'

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
    create: isLoggedIn,
    read: ownCompositions,
    update: ownCompositions,
    delete: ownCompositions,
  },
  hooks: {
    beforeValidate: [setOwnerOnCreate],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      maxLength: MAX_COMPOSITION_TITLE_LENGTH,
      defaultValue: DEFAULT_COMPOSITION_TITLE,
      validate: validateTitle,
    },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      access: { update: () => false },
      admin: { readOnly: true, position: 'sidebar' },
    },
    // Serialized Lexical state, validated by its JSON schema (which also types the field)
    { name: 'content', type: 'json', jsonSchema: LEXICAL_STATE_JSON_SCHEMA },
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
          admin: { description: 'In millimetres' },
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
