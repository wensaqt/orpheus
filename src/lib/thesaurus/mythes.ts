import type { PartOfSpeech, SynonymGroup, ThesaurusEntry } from './types'

/*
 * Parser for the myThes thesaurus format (LibreOffice / Dicollecte). Pure functions, no I/O.
 *
 *   UTF-8                      ← encoding, first line
 *   rapide|1                   ← entry: word | number of groups
 *   (Adjectif Nom)|vif|prompt  ← group: (parts of speech) | synonym | synonym …
 */

// Labels found in the French thesaurus, in both spellings and abbreviations
const PART_OF_SPEECH_ALIASES: Record<string, PartOfSpeech> = {
  nom: 'noun',
  adjectif: 'adjective',
  adj: 'adjective',
  verbe: 'verb',
  adverbe: 'adverb',
  pronom: 'pronoun',
  preposition: 'preposition',
  préposition: 'preposition',
  conjonction: 'conjunction',
  determinant: 'determiner',
  déterminant: 'determiner',
  interjection: 'interjection',
  interj: 'interjection',
  onomatopée: 'interjection',
}

export const normalizeWord = (word: string) => word.trim().toLowerCase().replace(/\s+/g, ' ')

// "(Adjectif Nom)" → 'adjective': the first known label; unknown ones ("?") are skipped
function mainPartOfSpeech(label: string): PartOfSpeech | undefined {
  return label
    .replace(/[()]/g, '')
    .split(/\s+/)
    .map((token) => PART_OF_SPEECH_ALIASES[token.toLowerCase()])
    .find(Boolean)
}

/*
 * One group line. myThes may list several parts of speech ("Adjectif Nom") for a single set of
 * synonyms; the first is the main one, and keeping only it avoids showing the same list twice.
 * Without a known part of speech, the group is filed as a noun, the most common case.
 */
function parseGroup(line: string, headword: string): SynonymGroup | null {
  const [label, ...synonyms] = line.split('|')
  const words = [
    ...new Set(synonyms.map((s) => s.trim()).filter((s) => s && s.toLowerCase() !== headword)),
  ]
  if (!words.length) return null
  return { partOfSpeech: mainPartOfSpeech(label) ?? 'noun', sense: null, words }
}

// Merges groups of the same part of speech: several senses are listed as separate lines
function mergeByPartOfSpeech(groups: SynonymGroup[]): SynonymGroup[] {
  const merged = new Map<PartOfSpeech, SynonymGroup>()
  for (const group of groups) {
    const existing = merged.get(group.partOfSpeech)
    if (!existing) merged.set(group.partOfSpeech, { ...group, words: [...group.words] })
    else
      for (const word of group.words) if (!existing.words.includes(word)) existing.words.push(word)
  }
  return [...merged.values()]
}

export function parseMyThes(source: string): ThesaurusEntry[] {
  const lines = source.split('\n')
  const entries = new Map<string, SynonymGroup[]>()

  // Line 0 is the encoding
  for (let i = 1; i < lines.length;) {
    const [head, count] = lines[i].split('|')
    const groupCount = Number(count)
    i += 1
    if (!head?.trim() || !Number.isInteger(groupCount) || groupCount < 0) continue

    const word = normalizeWord(head)
    const groups = lines
      .slice(i, i + groupCount)
      .map((line) => parseGroup(line, word))
      .filter((group): group is SynonymGroup => group !== null)
    i += groupCount
    // The same word can appear twice (spelling variants of the head): combine them
    if (groups.length) entries.set(word, [...(entries.get(word) ?? []), ...groups])
  }

  return [...entries].map(([word, groups]) => ({ word, groups: mergeByPartOfSpeech(groups) }))
}
