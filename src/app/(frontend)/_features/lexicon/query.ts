// Beyond this it is no longer a word or a short phrase: not worth querying Wiktionary
export const MAX_QUERY_LENGTH = 60

/*
 * Normalised search term (trimmed, lower case, single spaces), or null when there is nothing
 * usable to look up: empty, too long, or not a string (server action input comes from the client).
 */
export function parseQuery(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const query = raw.trim().toLowerCase().replace(/\s+/g, ' ')
  if (!query || query.length > MAX_QUERY_LENGTH) return null
  return query
}
