import type { CollectionConfig, JSONField } from 'payload'

import { isLoggedIn } from '@/access/isLoggedIn'
import { PARTS_OF_SPEECH, THESAURUS_LANGS, THESAURUS_SOURCES } from '@/lib/thesaurus/types'

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
 * Synonym dictionary: one document per word, language and source, filled by
 * `pnpm thesaurus:import` (scripts/import-thesaurus.ts). An inflected form has no groups of its
 * own but a `lemma` pointing to its base form. Readable by signed-in users; never written
 * through the app.
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
  // Also serves lookups by word alone (its leading column): no separate index on word
  indexes: [{ fields: ['word', 'lang', 'source'], unique: true }],
  timestamps: false,
  fields: [
    { name: 'word', type: 'text', required: true },
    {
      name: 'lang',
      type: 'select',
      required: true,
      defaultValue: 'fr',
      options: [...THESAURUS_LANGS],
    },
    {
      name: 'source',
      type: 'select',
      required: true,
      defaultValue: 'dicollecte',
      options: [...THESAURUS_SOURCES],
    },
    { name: 'groups', type: 'json', required: true, jsonSchema: GROUPS_JSON_SCHEMA },
    // Base form of an inflected form ("marchait" → "marcher")
    { name: 'lemma', type: 'text' },
    // Part of speech of that inflected form ("parlions": verb), listed first
    { name: 'lemmaPartOfSpeech', type: 'select', options: [...PARTS_OF_SPEECH] },
  ],
}
