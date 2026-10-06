import { normalizeWord } from '@/lib/thesaurus/normalizeWord'

import { MAX_QUERY_LENGTH } from './constants'

/*
 * Normalised search term (trimmed, lower case, single spaces), or null when there is nothing
 * usable to look up: empty, too long, or not a string (server action input comes from the client).
 */
export function parseQuery(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const query = normalizeWord(raw)
  if (!query || query.length > MAX_QUERY_LENGTH) return null
  return query
}

/*
 * Words to try, in order: the thesaurus is keyed by base form, so plurals fall back to the
 * singular (-s, -x, and -aux → -al: "chevaux" → "cheval").
 */
export const lookupCandidates = (word: string) => [
  ...new Set([
    word,
    ...(/aux$/.test(word) ? [`${word.slice(0, -3)}al`] : []),
    ...(/[sx]$/.test(word) ? [word.slice(0, -1)] : []),
  ]),
]
