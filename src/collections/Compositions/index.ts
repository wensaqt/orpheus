import type { CollectionConfig } from 'payload'

import { isLoggedIn } from '@/access/isLoggedIn'
import { DEFAULT_COMPOSITION_TITLE, MAX_COMPOSITION_TITLE_LENGTH } from '@/lib/compositions'
import {
  DEFAULT_PAGE_FORMAT,
  DEFAULT_PAGE_MARGIN,
  MAX_FIRST_LINE_INDENT,
  MAX_PAGE_MARGIN,
  PAGE_FORMATS,
  PAGE_ORIENTATIONS,
  type PageMargin,
} from '@/lib/pageFormats'

import { ownCompositions } from './access'
import { addFirstDocument, deleteBinder, setOwnerOnCreate } from './hooks'
import { validateTitle } from './validators'

// Each margin alone; whether they leave enough text together is checked when they are saved
const margin = (name: PageMargin) => ({
  name,
  type: 'number' as const,
  min: 0,
  max: MAX_PAGE_MARGIN,
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
    afterChange: [addFirstDocument],
    beforeDelete: [deleteBinder],
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
    // The text lives in the binder (binder-items): one composition, many documents
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
              options: [...PAGE_ORIENTATIONS],
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
        {
          name: 'firstLineIndent',
          type: 'number',
          min: 0,
          max: MAX_FIRST_LINE_INDENT,
          defaultValue: 0,
          admin: { description: 'Where each paragraph’s first line starts, in millimetres' },
        },
      ],
    },
  ],
  timestamps: true,
}
