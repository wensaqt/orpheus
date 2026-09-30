import 'server-only'

import { createMemoryCache } from '@front/_lib/server/memoryCache'

import type { SynonymGroup, SynonymResult } from './types'
import { parseQuery } from './query'
import { type ParsedPage, parseWiktionaryPage } from './wiktionary'

const API_URL = 'https://fr.wiktionary.org/w/api.php'
const PAGE_URL = 'https://fr.wiktionary.org/wiki/'
// Wikimedia asks API clients to identify themselves
const USER_AGENT = 'Orpheus/0.1 (https://github.com/wensaqt/orpheus)'
// Some pages are large ("marcher": ~2 s)
const REQUEST_TIMEOUT_MS = 8000

const HOUR_MS = 60 * 60 * 1000
const CACHE_MAX_ENTRIES = 2000
const FOUND_PAGE_TTL_MS = 24 * HOUR_MS
// A missing page may be created in the meantime: retry sooner
const MISSING_PAGE_TTL_MS = HOUR_MS

// A fetched page: its actual title (after redirects) and what the parser found
type Page = { title: string; parsed: ParsedPage }

const cachedPage = createMemoryCache<Page | null>({
  maxEntries: CACHE_MAX_ENTRIES,
  ttl: (page) => (page ? FOUND_PAGE_TTL_MS : MISSING_PAGE_TTL_MS),
})

// Parsed page for a normalised word, or null if it does not exist
async function fetchPage(word: string): Promise<Page | null> {
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
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    // No Next cache (it would write to disk): only the in-memory cache above is used
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`Wiktionary responded ${response.status}`)

  const data = (await response.json()) as {
    parse?: { title: string; wikitext: string }
    error?: { code: string }
  }
  if (data.error?.code === 'missingtitle') return null
  if (!data.parse) throw new Error(`Wiktionary error: ${data.error?.code ?? 'unknown'}`)
  // After a redirect ("oeuvre" → "œuvre") the headword is the target title
  const { title, wikitext } = data.parse
  return { title, parsed: parseWiktionaryPage(wikitext, title.toLowerCase()) }
}

const getPage = (word: string) => cachedPage(word, () => fetchPage(word))

const pageUrl = (title: string) => `${PAGE_URL}${encodeURIComponent(title.replace(/ /g, '_'))}`

const found = (title: string, synonyms: SynonymGroup[]) => ({
  word: title,
  groups: synonyms,
  sourceUrl: pageUrl(title),
})

/*
 * Synonyms of a normalised word. An inflected form with no synonyms of its own ("rapides",
 * "marchait") is followed once to its base form. If the base form cannot be loaded, the search
 * fails like any other Wiktionary error.
 */
export async function lookupSynonyms(word: string): Promise<Omit<SynonymResult, 'query'>> {
  const page = await getPage(word)
  if (!page) return { word: null, groups: [], sourceUrl: null }

  const lemma = page.parsed.lemma && parseQuery(page.parsed.lemma)
  if (page.parsed.synonyms.length || !lemma || lemma === word) {
    return found(page.title, page.parsed.synonyms)
  }

  const base = await getPage(lemma)
  return base ? found(base.title, base.parsed.synonyms) : found(page.title, [])
}
