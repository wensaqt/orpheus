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

type NeighboursOf = NonNullable<ComposeOptions['neighboursOf']>

function groupsOf(entries: SourceEntry[], source: ThesaurusSource): SynonymGroup[] {
  return entries.find((entry) => entry.source === source)?.groups ?? []
}

function curatedWordsByPartOfSpeech(groups: SynonymGroup[]): Map<PartOfSpeech, Set<string>> {
  const byPartOfSpeech = new Map<PartOfSpeech, Set<string>>()
  for (const group of groups) {
    const words = byPartOfSpeech.get(group.partOfSpeech) ?? new Set<string>()
    group.words.forEach((word) => words.add(word))
    byPartOfSpeech.set(group.partOfSpeech, words)
  }
  return byPartOfSpeech
}

function coherentSuggestions(
  words: string[],
  curated: Set<string>,
  neighboursOf: NeighboursOf,
): string[] {
  const required = Math.min(MIN_SHARED_WITH_CURATED, curated.size)
  const sharedWords = (word: string) =>
    [...(neighboursOf(word) ?? [])].filter((neighbour) => curated.has(neighbour)).length
  return words.filter((word) => sharedWords(word) >= required).slice(0, MORE_PER_GROUP)
}

function appendUncoveredGroup(
  main: ResultGroup[],
  group: SynonymGroup,
  words: string[],
  hasCuratedEntry: boolean,
): void {
  const suggestions = hasCuratedEntry ? words.slice(0, MORE_PER_GROUP) : words
  if (suggestions.length) main.push({ ...withWords(group, suggestions), reliable: false })
}

function mergeDicollecte(
  groups: SynonymGroup[],
  wiktionary: SynonymGroup[],
  neighboursOf: NeighboursOf,
) {
  const curatedByPartOfSpeech = curatedWordsByPartOfSpeech(wiktionary)
  const shown = new Set(wiktionary.flatMap((group) => group.words))
  const main: ResultGroup[] = wiktionary.map((group) => ({ ...group, reliable: true }))
  const more: SynonymGroup[] = []
  for (const group of groups) {
    const fresh = group.words.filter((word) => !shown.has(word))
    const curated = curatedByPartOfSpeech.get(group.partOfSpeech)
    if (!curated) appendUncoveredGroup(main, group, fresh, wiktionary.length > 0)
    else {
      const coherent = coherentSuggestions(fresh, curated, neighboursOf)
      if (coherent.length) more.push(withWords(group, coherent))
    }
  }
  return { main, more }
}

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
  const wiktionary = groupsOf(entries, 'wiktionary')
  const dicollecte = groupsOf(entries, 'dicollecte')
  if (!wiktionary.length && !dicollecte.length) return EMPTY_RESULT

  const { main, more } = mergeDicollecte(dicollecte, wiktionary, neighboursOf)

  return {
    word,
    groups: preferring(main, preferredPartOfSpeech),
    more: preferring(more, preferredPartOfSpeech),
    sourceUrl: wiktionary.length ? wiktionaryPageUrl(word) : null,
  }
}
