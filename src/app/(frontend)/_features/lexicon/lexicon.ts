import { THESAURUS_LANGUAGE } from '@/lib/thesaurus/types'
import 'server-only'

import type { Session } from '@front/_lib/server/auth'

import { composeResult } from './compose'
import { EMPTY_RESULT, MORE_PER_GROUP } from './constants'
import { lookupCandidates } from './query'
import type { SynonymResult } from './types'

// Dicollecte suggestions checked for coherence, per lookup (a few groups' worth of heads)
// Check the heads of at most four groups per lookup
const CHECKED_GROUPS = 4
const MAX_CHECKED_SUGGESTIONS = CHECKED_GROUPS * MORE_PER_GROUP

type Entry = Awaited<ReturnType<typeof findEntries>>[number]

// Every source's entry for these words, in one indexed query
async function findEntries({ payload, user }: Session, words: string[]) {
  const { docs } = await payload.find({
    collection: 'thesaurus-entries',
    where: { lang: { equals: THESAURUS_LANGUAGE }, word: { in: words } },
    select: { word: true, source: true, groups: true, lemma: true, lemmaPartOfSpeech: true },
    pagination: false,
    depth: 0,
    user,
    overrideAccess: false,
  })
  return docs
}

const wordsOf = (entries: Entry[]) =>
  entries.flatMap((entry) => entry.groups.flatMap((group) => group.words))

/*
 * Synonyms of the Dicollecte suggestions (every source), used by composeResult to keep only
 * suggestions related to the curated synonyms. One extra query, skipped when there is nothing
 * to check against.
 */
async function suggestionNeighbours(session: Session, entries: Entry[]) {
  const curated = new Set(wordsOf(entries.filter((entry) => entry.source === 'wiktionary')))
  const suggestions = wordsOf(entries.filter((entry) => entry.source === 'dicollecte'))
    .filter((suggestion) => !curated.has(suggestion))
    .slice(0, MAX_CHECKED_SUGGESTIONS)
  const neighbours = new Map<string, Set<string>>()
  if (!curated.size || !suggestions.length) return neighbours

  for (const entry of await findEntries(session, suggestions)) {
    const words = neighbours.get(entry.word) ?? new Set<string>()
    for (const group of entry.groups) for (const w of group.words) words.add(w)
    neighbours.set(entry.word, words)
  }
  return neighbours
}

/*
 * Synonyms of a normalised word. The first candidate found wins (the word itself before its
 * singular). An inflected form with no synonyms of its own ("marchait") leads to its base form
 * ("marcher"), whose synonyms of the same part of speech come first.
 */
export async function lookupSynonyms(
  session: Session,
  word: string,
): Promise<Omit<SynonymResult, 'query'>> {
  const candidates = lookupCandidates(word)
  const docs = await findEntries(session, candidates)
  const found = candidates.find((candidate) => docs.some((doc) => doc.word === candidate))
  if (!found) return EMPTY_RESULT

  let headword = found
  let entries = docs.filter((doc) => doc.word === found)
  const form = entries.find((entry) => entry.lemma)
  const preferredPartOfSpeech = form?.lemmaPartOfSpeech ?? null

  if (!entries.some((entry) => entry.groups.length) && form?.lemma && form.lemma !== found) {
    const base = await findEntries(session, [form.lemma])
    if (base.length) {
      headword = form.lemma
      entries = base
    }
  }

  const neighbours = await suggestionNeighbours(session, entries)
  return composeResult(headword, entries, {
    preferredPartOfSpeech,
    neighboursOf: (suggestion) => neighbours.get(suggestion),
  })
}
