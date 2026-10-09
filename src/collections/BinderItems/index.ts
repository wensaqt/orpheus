import type { CollectionConfig } from 'payload'

import {
  BINDER_ITEM_KINDS,
  DEFAULT_DOCUMENT_TITLE,
  MAX_BINDER_TITLE_LENGTH,
} from '@/lib/binder/constants'
import { LEXICAL_STATE_JSON_SCHEMA } from '@/lib/lexical'

import { validateTitle } from '../validators'
import { ownedByUser } from '@/access/ownedByUser'
import { canAddToComposition } from './access'
import { deleteContents, keepBinderTree, validateDocumentBody } from './hooks'

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
    read: ownedByUser,
    update: ownedByUser,
    delete: ownedByUser,
  },
  hooks: {
    beforeValidate: [keepBinderTree, validateDocumentBody],
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
      name: 'documentType',
      type: 'select',
      options: ['text', 'score'],
      required: true,
      defaultValue: 'text',
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
    // Partition documents only. The prototype stores MusicXML directly until a score model is chosen.
    { name: 'scoreXml', type: 'textarea' },
  ],
  timestamps: true,
}
