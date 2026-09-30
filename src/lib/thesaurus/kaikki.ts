import { normalizeWord } from './mythes'
import type { PartOfSpeech, SynonymGroup, ThesaurusEntry } from './types'

/*
 * Extraction of synonyms and base forms from the kaikki.org JSONL export of the French Wiktionary
 * (wiktextract). Pure functions: the import script streams the file and feeds them records.
 */

// kaikki part-of-speech codes; others (proper names, phrases, affixes…) are ignored
const POS_BY_CODE: Record<string, PartOfSpeech> = {
  noun: 'noun',
  adj: 'adjective',
  verb: 'verb',
  adv: 'adverb',
  pron: 'pronoun',
  prep: 'preposition',
  conj: 'conjunction',
  det: 'determiner',
  intj: 'interjection',
}

const MAX_SENSE_LENGTH = 80
const MAX_WORD_LENGTH = 60

// Definition numbers copied from the wikitext: "(1)", "(1, 2)"
const DEFINITION_REFERENCE = /\((\d+)(?:\s*,\s*\d+)*\)/
const LONE_DEFINITION_REFERENCE = new RegExp(`^${DEFINITION_REFERENCE.source}$`)

type KaikkiLink = { word?: string; sense?: string }
type KaikkiSense = { glosses?: string[]; synonyms?: KaikkiLink[]; form_of?: KaikkiLink[] }
export type KaikkiRecord = {
  word?: string
  lang_code?: string
  pos?: string
  synonyms?: KaikkiLink[]
  senses?: KaikkiSense[]
}

// What one record contributes: synonym groups, and base forms if it is an inflected form
export type ExtractedRecord = {
  word: string
  partOfSpeech: PartOfSpeech
  groups: SynonymGroup[]
  lemmas: string[]
}

// Only lines mentioning one of these can contribute: a cheap test before JSON.parse
export const mayContribute = (line: string) =>
  line.includes('"synonyms"') || line.includes('"form_of"')

const truncate = (text: string) =>
  text.length > MAX_SENSE_LENGTH ? `${text.slice(0, MAX_SENSE_LENGTH).trimEnd()}…` : text

/*
 * Readable sense label. kaikki keeps Wiktionary's raw markers: a lone "(1)" points to definition
 * 1, whose gloss is used; otherwise "(n)" and a trailing ":" are dropped ("Animal (1) :").
 */
function cleanSense(sense: string | undefined, glosses: (string | undefined)[]): string | null {
  const text = sense?.replace(/\s+/g, ' ').trim() ?? ''
  const lone = LONE_DEFINITION_REFERENCE.exec(text)
  const label = lone
    ? (glosses[Number(lone[1]) - 1] ?? '')
    : text.replace(DEFINITION_REFERENCE, '').replace(/\s*:\s*$/, '')
  const cleaned = label.replace(/\s+/g, ' ').trim()
  return cleaned ? truncate(cleaned) : null
}

// A usable linked word: not the headword, not another namespace (Thésaurus:…), not a sentence
const isWord = (candidate: string, headword: string) =>
  Boolean(candidate) &&
  candidate.length <= MAX_WORD_LENGTH &&
  !candidate.includes(':') &&
  candidate.toLowerCase() !== headword

export function extractRecord(record: KaikkiRecord): ExtractedRecord | null {
  if (record.lang_code !== 'fr' || !record.word) return null
  const partOfSpeech = record.pos ? POS_BY_CODE[record.pos] : undefined
  if (!partOfSpeech) return null
  const word = normalizeWord(record.word)
  const glosses = (record.senses ?? []).map((sense) => sense.glosses?.[0])

  // Entry-level synonyms may name their sense; sense-level ones take the sense's gloss
  const links: { word: string; sense: string | null }[] = [
    ...(record.synonyms ?? []).map((link) => ({
      word: link.word ?? '',
      sense: cleanSense(link.sense, glosses),
    })),
    ...(record.senses ?? []).flatMap((sense) =>
      (sense.synonyms ?? []).map((link) => ({
        word: link.word ?? '',
        sense: cleanSense(link.sense ?? sense.glosses?.[0], glosses),
      })),
    ),
  ]

  const groups: SynonymGroup[] = []
  for (const link of links) {
    const synonym = link.word.trim()
    if (!isWord(synonym, word)) continue
    let group = groups.find((candidate) => candidate.sense === link.sense)
    if (!group) {
      group = { partOfSpeech, sense: link.sense, words: [] }
      groups.push(group)
    }
    if (!group.words.includes(synonym)) group.words.push(synonym)
  }

  const lemmas = [
    ...new Set(
      (record.senses ?? [])
        .flatMap((sense) => sense.form_of ?? [])
        .map((link) => normalizeWord(link.word ?? ''))
        .filter((lemma) => lemma && lemma !== word),
    ),
  ]

  return groups.length || lemmas.length ? { word, partOfSpeech, groups, lemmas } : null
}

/*
 * Accumulates records (a word can have one record per part of speech) into one entry per word.
 */
export function createKaikkiCollector() {
  const groupsByWord = new Map<string, SynonymGroup[]>()
  const formByWord = new Map<string, { lemma: string; partOfSpeech: PartOfSpeech }>()

  return {
    add(extracted: ExtractedRecord) {
      if (extracted.groups.length) {
        groupsByWord.set(extracted.word, [
          ...(groupsByWord.get(extracted.word) ?? []),
          ...extracted.groups,
        ])
      }
      // First base form wins: "marchait" → "marcher"
      if (extracted.lemmas.length && !formByWord.has(extracted.word)) {
        formByWord.set(extracted.word, {
          lemma: extracted.lemmas[0],
          partOfSpeech: extracted.partOfSpeech,
        })
      }
    },
    /*
     * One entry per word. Inflected forms are kept only when their base form has synonyms in
     * some source (hasSynonyms), so the table does not fill with every conjugated verb.
     */
    entries(hasSynonyms: (word: string) => boolean): ThesaurusEntry[] {
      const words = new Set([...groupsByWord.keys(), ...formByWord.keys()])
      return [...words].flatMap((word) => {
        const groups = groupsByWord.get(word) ?? []
        const form = formByWord.get(word)
        const kept = form && (groupsByWord.has(form.lemma) || hasSynonyms(form.lemma)) ? form : null
        if (!groups.length && !kept) return []
        return [
          {
            word,
            groups,
            lemma: kept?.lemma ?? null,
            // Part of speech of the inflected form ("parlions": verb), to list those synonyms first
            lemmaPartOfSpeech: kept?.partOfSpeech ?? null,
          },
        ]
      })
    },
  }
}
