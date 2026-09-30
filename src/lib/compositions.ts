import type { JSONField } from 'payload'

// Constantes du domaine « compositions », partagées par la collection Payload et le frontend
export const DEFAULT_COMPOSITION_TITLE = 'Untitled composition'
export const MAX_COMPOSITION_TITLE_LENGTH = 200

// Identifiant du schéma : Payload l'exige, mais comme le schéma est fourni ici, rien n'est téléchargé
const LEXICAL_STATE_SCHEMA_URI = 'https://orpheus.app/schemas/lexical-state.json'

/*
 * Forme minimale d'un état Lexical sérialisé (editorState.toJSON()). Validé par Payload (ajv) à
 * chaque écriture, et repris par generate:types pour typer le champ content.
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
