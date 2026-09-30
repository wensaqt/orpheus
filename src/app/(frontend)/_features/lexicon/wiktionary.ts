import type { PartOfSpeech, Relation, WordGroup } from './types'

// Parses the wikitext of a French Wiktionary page. Pure functions, no network.

// Part-of-speech sections ("=== {{S|adjectif|fr}} ===") to keep
const PARTS_OF_SPEECH: Record<string, PartOfSpeech> = {
  nom: 'noun',
  adjectif: 'adjective',
  verbe: 'verb',
  adverbe: 'adverb',
  pronom: 'pronoun',
  préposition: 'preposition',
  conjonction: 'conjunction',
  article: 'determiner',
  interjection: 'interjection',
}

// Subsections holding each relation
const RELATION_SECTIONS: Record<Relation, string[]> = {
  synonyms: ['synonymes', 'quasi-synonymes'],
  antonyms: ['antonymes'],
}

// Maximum length of a sense label taken from a definition
const SENSE_LENGTH = 80

export type ParsedPage = {
  groups: Record<Relation, WordGroup[]>
  // Base form cited by an inflected-form page ("Pluriel de [[rapide]]"), or null
  lemma: string | null
}

type Section = { level: number; name: string; params: string[]; body: string }

// French section of the page, between "== {{langue|fr}} ==" and the next language
const frenchSection = (wikitext: string) =>
  /==\s*\{\{langue\|fr\}\}\s*==([\s\S]*?)(?=\n==\s*\{\{langue\||$)/.exec(wikitext)?.[1] ?? ''

// Splits into "{{S|nom|params…}}" sections with their level (number of "=")
function sections(text: string): Section[] {
  const headers = [...text.matchAll(/^(={3,})\s*\{\{S\|([^}]*)\}\}\s*=+\s*$/gm)]
  return headers.map((header, i) => {
    const [name, ...params] = header[2].split('|').map((part) => part.trim())
    const start = header.index + header[0].length
    return {
      level: header[1].length,
      name,
      params,
      body: text.slice(start, headers[i + 1]?.index ?? text.length),
    }
  })
}

// Readable label: strips templates, links and wiki formatting
const plainText = (text: string) =>
  text
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/'{2,}/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*:\s*$/, '')
    .trim()

// Related words in a line: [[mot]], [[mot|affiché]], {{lien|mot|fr}}, {{l|mot|fr}}, {{cf|lang=fr|mot}}
function linkedWords(line: string): string[] {
  const words = [
    ...[...line.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g)].map((m) => m[1]),
    ...[...line.matchAll(/\{\{(?:lien|l)\|([^|}]+)\|fr[^}]*\}\}/g)].map((m) => m[1]),
    ...[...line.matchAll(/\{\{cf\|([^}]*)\}\}/g)].flatMap((m) =>
      m[1].split('|').filter((param) => !param.includes('=')),
    ),
  ]
  // Links to other namespaces (Thésaurus:, w:…) are not words
  return words.map((word) => word.trim()).filter((word) => word && !word.includes(':'))
}

// Definition numbers cited alone, "(1)" or "(1, 2)"
const DEFINITION_REFERENCE = /^\((\d+)(?:\s*,\s*\d+)*\)$/

/*
 * Sense label of a header line ("; …", ": ''…'' (1) :", "'''…'''", "(1)"). A number on its
 * own refers to the matching definition, whose beginning is used.
 */
function senseLabel(line: string, definitions: string[]): string | null {
  const label = plainText(line.replace(/^[;:]+/, ''))
  const reference = DEFINITION_REFERENCE.exec(label)
  if (reference) {
    const definition = definitions[Number(reference[1]) - 1]
    return definition ? truncate(definition) : null
  }
  return label.replace(/\s*\(\d+(?:\s*,\s*\d+)*\)\s*$/, '') || null
}

const truncate = (text: string) =>
  text.length > SENSE_LENGTH ? `${text.slice(0, SENSE_LENGTH).trimEnd()}…` : text

// Top-level definitions of a part-of-speech section ("# …", without "#*" examples)
const definitionsOf = (body: string) =>
  body
    .split('\n')
    .filter((line) => /^#(?![*:#])/.test(line))
    .map((line) => plainText(line.slice(1)))

/*
 * List of a subsection. A line without related words announces a sense and opens a group; a line
 * with words feeds the current group, or its own group if it starts with a sense
 * ("* ''(transparence)'' : [[opaque]]").
 */
function parseList(
  body: string,
  partOfSpeech: PartOfSpeech,
  headword: string,
  definitions: string[],
): WordGroup[] {
  const groups: WordGroup[] = []
  let current: WordGroup | null = null
  const open = (sense: string | null) => {
    current = { partsOfSpeech: [partOfSpeech], sense, words: [] }
    groups.push(current)
    return current
  }

  for (const raw of body.split('\n')) {
    const line = raw.trim()
    // Column openings and closings: {{(}}, {{)}}
    if (!line || /^\{\{[()]/.test(line)) continue

    const words = linkedWords(line).filter((word) => word !== headword)
    if (!words.length) {
      open(senseLabel(line, definitions))
      continue
    }

    const inlineSense = /^[*:]+\s*('{2,}[^:]*?'{2,}|\([^)]*\))\s*:/.exec(line)
    const group: WordGroup = inlineSense
      ? open(plainText(inlineSense[1]).replace(/^\((.*)\)$/, '$1'))
      : (current ?? open(null))
    for (const word of words) if (!group.words.includes(word)) group.words.push(word)
  }
  return groups.filter((group) => group.words.length)
}

export function parseWiktionaryPage(wikitext: string, headword: string): ParsedPage {
  const parsed: ParsedPage = { groups: { synonyms: [], antonyms: [] }, lemma: null }
  let partOfSpeech: PartOfSpeech | null = null
  let definitions: string[] = []

  for (const section of sections(frenchSection(wikitext))) {
    if (section.level === 3) {
      partOfSpeech = PARTS_OF_SPEECH[section.name] ?? null
      definitions = definitionsOf(section.body)
      // Inflected form: the first definition points to the base form
      if (partOfSpeech && section.params.includes('flexion') && !parsed.lemma) {
        const definition = /^#\s*''[^']*''\s*\[\[([^\]|#]+)/m.exec(section.body)
        parsed.lemma = definition?.[1].trim() ?? null
      }
      continue
    }
    if (!partOfSpeech) continue
    for (const [relation, names] of Object.entries(RELATION_SECTIONS) as [Relation, string[]][]) {
      if (names.includes(section.name)) {
        parsed.groups[relation].push(
          ...parseList(section.body, partOfSpeech, headword, definitions),
        )
      }
    }
  }
  return parsed
}
