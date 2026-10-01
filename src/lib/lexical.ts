import type { JSONField } from 'payload'

// Schema identifier: Payload requires it, but since the schema is provided here, nothing is downloaded
const LEXICAL_STATE_SCHEMA_URI = 'https://orpheus.app/schemas/lexical-state.json'

/*
 * Minimal shape of a serialized Lexical state (editorState.toJSON()). Validated by Payload (ajv) on
 * every write, and picked up by generate:types to type the content field.
 */
export const LEXICAL_STATE_JSON_SCHEMA: NonNullable<JSONField['jsonSchema']> = {
  uri: LEXICAL_STATE_SCHEMA_URI,
  fileMatch: [LEXICAL_STATE_SCHEMA_URI],
  schema: {
    type: 'object',
    required: ['root'],
    additionalProperties: false,
    properties: {
      root: {
        type: 'object',
        required: ['type', 'children'],
        additionalProperties: true,
        properties: {
          type: { const: 'root' },
          children: { type: 'array', items: { type: 'object' } },
        },
      },
    },
  },
}
