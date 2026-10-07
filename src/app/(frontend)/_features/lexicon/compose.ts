import { wiktionaryPageUrl } from '@/lib/thesaurus/source'
import type { PartOfSpeech, SynonymGroup, ThesaurusSource } from '@/lib/thesaurus/types'

import { EMPTY_RESULT, MORE_PER_GROUP, MIN_SHARED_WITH_CURATED } from './constants'
import type { ResultGroup, SynonymResult } from './types'

export type SourceEntry = { source: ThesaurusSource; groups: SynonymGroup[] }

export type ComposeOptions = {
  // Part of speech of the searched form ("parlions": verb): its groups come first
  preferredPartOfSpeech?: PartOfSpeech | null
  // Synonyms of each Dicollecte suggestion, to check it against the curated ones
  neighboursOf?: (word: string) => Iterable<string> | undefined
}

// Stable sort: groups of the preferred part of speech first, others keep their order
function preferring<T extends SynonymGroup>(groups: T[], partOfSpeech?: PartOfSpeech | null) {
  if (!partOfSpeech) return groups
  return [
    ...groups.filter((group) => group.partOfSpeech === partOfSpeech),
    ...groups.filter((group) => group.partOfSpeech !== partOfSpeech),
  ]
}

const withWords = <T extends SynonymGroup>(group: T, words: string[]): T => ({ ...group, words })

/*
 * Combines the sources' entries for one word (pure).
 *
 * - Wiktionary groups (curated) lead.
 * - For a part of speech the Wiktionary does not cover, the Dicollecte group joins the main
 *   groups, flagged as less reliable ("parler" has no verb synonyms on the Wiktionary).
 * - For a covered part of speech, Dicollecte only adds collapsed suggestions, kept when their
 *   own synonyms share MIN_SHARED_WITH_CURATED words with the curated ones of that part of speech
 *   (all of them if there are fewer): Dicollecte chains synonyms of synonyms regardless of sense
 *   ("heureux" → aise → "toilettes").
 */
export function composeResult(
  word: string,
  entries: SourceEntry[],
  { preferredPartOfSpeech, neighboursOf = () => undefined }: ComposeOptions = {},
): Omit<SynonymResult, 'query'> {
  const groupsOf = (source: ThesaurusSource) =>
    entries.find((entry) => entry.source === source)?.groups ?? []
  const wiktionary = groupsOf('wiktionary')
  const dicollecte = groupsOf('dicollecte')
  if (!wiktionary.length && !dicollecte.length) return EMPTY_RESULT

  const curatedByPartOfSpeech = new Map<PartOfSpeech, Set<string>>()
  for (const group of wiktionary) {
    const words = curatedByPartOfSpeech.get(group.partOfSpeech) ?? new Set<string>()
    for (const w of group.words) words.add(w)
    curatedByPartOfSpeech.set(group.partOfSpeech, words)
  }
  const shown = new Set(wiktionary.flatMap((group) => group.words))

  const main: ResultGroup[] = wiktionary.map((group) => ({ ...group, reliable: true }))
  const more: SynonymGroup[] = []
  for (const group of dicollecte) {
    const curated = curatedByPartOfSpeech.get(group.partOfSpeech)
    const fresh = group.words.filter((w) => !shown.has(w))
    if (!curated) {
      // Uncovered part of speech: Dicollecte stands in (all of it when there is no Wiktionary entry)
      const words = wiktionary.length ? fresh.slice(0, MORE_PER_GROUP) : fresh
      if (words.length) main.push({ ...withWords(group, words), reliable: false })
      continue
    }
    const required = Math.min(MIN_SHARED_WITH_CURATED, curated.size)
    const shared = (w: string) => [...(neighboursOf(w) ?? [])].filter((n) => curated.has(n)).length
    const coherent = fresh.filter((w) => shared(w) >= required)
    if (coherent.length) more.push(withWords(group, coherent.slice(0, MORE_PER_GROUP)))
  }

  return {
    word,
    groups: preferring(main, preferredPartOfSpeech),
    more: preferring(more, preferredPartOfSpeech),
    sourceUrl: wiktionary.length ? wiktionaryPageUrl(word) : null,
  }
}
