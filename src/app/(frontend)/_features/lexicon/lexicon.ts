import 'server-only'

import { createMemoryCache } from '@front/_lib/server/memoryCache'

import { normalizeWord } from './normalize'
import type { Relation, WordGroup } from './types'
import { type ParsedPage, parseWiktionaryPage } from './wiktionary'

const API_URL = 'https://fr.wiktionary.org/w/api.php'
export const PAGE_URL = 'https://fr.wiktionary.org/wiki/'
// Wikimedia asks apps querying its API to identify themselves
const USER_AGENT = 'Orpheus/0.1 (https://github.com/wensaqt/orpheus)'
// Some pages are large ("marcher": ~2 s)
const REQUEST_TIMEOUT = 8000

const HOUR = 60 * 60 * 1000
const cachedPage = createMemoryCache<ParsedPage | null>({
  maxEntries: 2000,
  // A missing page may be created in the meantime: retry it sooner
  ttl: (page) => (page ? 24 * HOUR : HOUR),
})

// Parsed wikitext of a page, or null if it does not exist
async function fetchPage(word: string): Promise<ParsedPage | null> {
  const params = new URLSearchParams({
    action: 'parse',
    page: word,
    prop: 'wikitext',
    format: 'json',
    formatversion: '2',
    redirects: '1',
  })
  const response = await fetch(`${API_URL}?${params}`, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    // No Next cache (it would write to disk): only the in-memory cache above is used
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`Wiktionary responded ${response.status}`)

  const data = (await response.json()) as {
    parse?: { wikitext: string }
    error?: { code: string }
  }
  if (data.error?.code === 'missingtitle') return null
  if (!data.parse) throw new Error(`Wiktionary error: ${data.error?.code ?? 'unknown'}`)
  return parseWiktionaryPage(data.parse.wikitext, word)
}

const getPage = (word: string) => cachedPage(word, () => fetchPage(word))

export type RelatedWords = { word: string | null; groups: WordGroup[] }

/*
 * Words related to a word. For an inflected form without its own relations ("rapides", "marchait"),
 * follow the link to its base form once.
 */
export async function lookupRelated(query: string, relation: Relation): Promise<RelatedWords> {
  const word = normalizeWord(query)
  const page = await getPage(word)
  if (!page) return { word: null, groups: [] }
  if (page.groups[relation].length || !page.lemma) {
    return { word, groups: page.groups[relation] }
  }

  const lemma = await getPage(page.lemma)
  return lemma ? { word: page.lemma, groups: lemma.groups[relation] } : { word, groups: [] }
}
