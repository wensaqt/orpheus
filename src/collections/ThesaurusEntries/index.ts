import type { CollectionConfig, JSONField } from 'payload'

import { isLoggedIn } from '@/access/isLoggedIn'
import { PARTS_OF_SPEECH, THESAURUS_LANGS } from '@/lib/thesaurus/types'

const GROUPS_SCHEMA_URI = 'https://orpheus.app/schemas/synonym-groups.json'

// Shape of `groups`: validated on write and used by generate:types to type the field
const GROUPS_JSON_SCHEMA: NonNullable<JSONField['jsonSchema']> = {
  uri: GROUPS_SCHEMA_URI,
  fileMatch: [GROUPS_SCHEMA_URI],
  schema: {
    type: 'array',
    items: {
      type: 'object',
      additionalProperties: false,
      required: ['partOfSpeech', 'sense', 'words'],
      properties: {
        partOfSpeech: { enum: [...PARTS_OF_SPEECH] },
        sense: { type: ['string', 'null'] },
        words: { type: 'array', items: { type: 'string' } },
      },
    },
  },
}

/*
 * Synonym dictionary, one document per word and language, filled by `pnpm thesaurus:import`
 * (scripts/import-thesaurus.ts). Readable by signed-in users; never written through the app.
 */
export const ThesaurusEntries: CollectionConfig = {
  slug: 'thesaurus-entries',
  admin: {
    hidden: true,
    useAsTitle: 'word',
  },
  access: {
    read: isLoggedIn,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  indexes: [{ fields: ['word', 'lang'], unique: true }],
  timestamps: false,
  fields: [
    { name: 'word', type: 'text', required: true, index: true },
    {
      name: 'lang',
      type: 'select',
      required: true,
      defaultValue: 'fr',
      options: [...THESAURUS_LANGS],
    },
    { name: 'groups', type: 'json', required: true, jsonSchema: GROUPS_JSON_SCHEMA },
  ],
}
