import type { CollectionConfig } from 'payload'

import {
  BINDER_ITEM_KINDS,
  DEFAULT_DOCUMENT_TITLE,
  MAX_BINDER_TITLE_LENGTH,
} from '@/lib/binder/constants'
import { LEXICAL_STATE_JSON_SCHEMA } from '@/lib/lexical'

import { validateTitle } from '../Compositions/validators'
import { canAddToComposition, ownBinderItems } from './access'
import { deleteContents, keepBinderTree } from './hooks'

// Set once, at creation: an item never changes composition, owner or kind
const fixed = { update: () => false }

/*
 * The binder ("chutier") of a composition: folders and documents in a free tree. Documents
 * hold the text; the composition holds what they share (title, page format).
 */
export const BinderItems: CollectionConfig = {
  slug: 'binder-items',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'kind', 'composition', 'updatedAt'],
  },
  access: {
    create: canAddToComposition,
    read: ownBinderItems,
    update: ownBinderItems,
    delete: ownBinderItems,
  },
  hooks: {
    beforeValidate: [keepBinderTree],
    beforeDelete: [deleteContents],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      maxLength: MAX_BINDER_TITLE_LENGTH,
      defaultValue: DEFAULT_DOCUMENT_TITLE,
      validate: validateTitle,
    },
    {
      name: 'kind',
      type: 'select',
      options: [...BINDER_ITEM_KINDS],
      required: true,
      defaultValue: 'document',
      access: fixed,
    },
    {
      name: 'composition',
      type: 'relationship',
      relationTo: 'compositions',
      required: true,
      index: true,
      access: fixed,
      admin: { position: 'sidebar' },
    },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      access: fixed,
      admin: { readOnly: true, position: 'sidebar' },
    },
    // The folder it is in; empty at the root of the binder
    { name: 'parent', type: 'relationship', relationTo: 'binder-items', index: true },
    // Order among siblings
    { name: 'position', type: 'number', required: true, admin: { step: 1 } },
    // Documents only: serialized Lexical state, validated by its JSON schema
    { name: 'content', type: 'json', jsonSchema: LEXICAL_STATE_JSON_SCHEMA },
  ],
  timestamps: true,
}
