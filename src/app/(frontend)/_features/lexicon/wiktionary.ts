import type { PartOfSpeech, SynonymGroup } from './types'

// Parsing of French Wiktionary wikitext. Pure functions, no network.

// Part-of-speech sections are level-3 headers: "=== {{S|adjectif|fr}} ==="
const POS_LEVEL = 3

// First word of the section name ("pronom personnel" → "pronom"), with common abbreviations
const POS_BY_SECTION: Record<string, PartOfSpeech> = {
  nom: 'noun',
  adjectif: 'adjective',
  adj: 'adjective',
  verbe: 'verb',
  adverbe: 'adverb',
  adv: 'adverb',
  pronom: 'pronoun',
  préposition: 'preposition',
  prép: 'preposition',
  conjonction: 'conjunction',
  conj: 'conjunction',
  article: 'determiner',
  déterminant: 'determiner',
  interjection: 'interjection',
  interj: 'interjection',
  onomatopée: 'interjection',
}

// Subsections listing synonyms
const SYNONYM_SECTIONS = new Set(['synonymes', 'quasi-synonymes'])

const MAX_SENSE_LENGTH = 80

// Any header line; an HTML comment may trail it ("==== {{S|synonymes}} ==== <!-- … -->")
const HEADER = /^(={2,})\s*(.*?)\s*=+\s*(?:<!--[\s\S]*?-->\s*)*$/gm
// Section template inside a header: {{S|name|params…}}
const SECTION_TEMPLATE = /^\{\{S\|([^}]*)\}\}$/
// French section, from "== {{langue|fr}} ==" to the next language
const FRENCH_SECTION = /==\s*\{\{langue\|fr\}\}\s*==([\s\S]*?)(?=\n==\s*\{\{langue\||$)/
// Column markers around long lists: {{(}}, {{)}}, {{(|colonnes=4}}
const COLUMN_MARKER = /^\{\{[()]/
// Definition numbers alone: "(1)" or "(1, 2)"
const DEFINITION_REFERENCE_BODY = String.raw`\((\d+)(?:\s*,\s*\d+)*\)`
const DEFINITION_REFERENCE = new RegExp(`^${DEFINITION_REFERENCE_BODY}$`)
const TRAILING_DEFINITION_REFERENCE = new RegExp(`\\s*${DEFINITION_REFERENCE_BODY}\\s*$`)
// Sense written at the start of a list line: "* ''(transparence)'' : [[opaque]]"
const INLINE_SENSE = /^[*:]+\s*('{2,}[^:]*?'{2,}|\([^)]*\))\s*:/
// Line that only announces a sense: "; …", ": … :", "'''…'''"
const SENSE_HEADER = /^;|^:.*:\s*$|^'{3}.*'{3}$/

export type ParsedPage = {
  synonyms: SynonymGroup[]
  // Base form named by an inflected-form page ("Pluriel de [[rapide]]"), or null
  lemma: string | null
}

type Section = { level: number; name: string | null; params: string[]; body: string }

// Splits on every header; name/params are set only for {{S|…}} headers
function sections(text: string): Section[] {
  const headers = [...text.matchAll(HEADER)]
  return headers.map((header, i) => {
    const template = SECTION_TEMPLATE.exec(header[2])
    const [name = null, ...params] = template ? template[1].split('|').map((p) => p.trim()) : []
    const start = header.index + header[0].length
    return {
      level: header[1].length,
      name,
      params,
      body: text.slice(start, headers[i + 1]?.index ?? text.length),
    }
  })
}

// Readable label: strips templates (nested ones included), links and wiki formatting
function plainText(text: string) {
  let stripped = text
  for (let previous = ''; previous !== stripped;) {
    previous = stripped
    stripped = stripped.replace(/\{\{[^{}]*\}\}/g, '')
  }
  return stripped
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/'{2,}/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*:\s*$/, '')
    .trim()
}

// Linked words of a line: [[w]], [[w|label]], {{lien|w|fr}}, {{l|w|fr}}, {{cf|lang=fr|w}}
function linkedWords(line: string): string[] {
  const words = [
    ...[...line.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g)].map((m) => m[1]),
    ...[...line.matchAll(/\{\{(?:lien|l)\|([^|}]+)\|fr(?:\||\}\})/g)].map((m) => m[1]),
    ...[...line.matchAll(/\{\{cf\|([^}]*)\}\}/g)].flatMap((m) =>
      m[1].split('|').filter((param) => !param.includes('=')),
    ),
  ]
  // Links to other namespaces (Thésaurus:, w:…) are not words
  return words.map((word) => word.trim()).filter((word) => word && !word.includes(':'))
}

const truncate = (text: string) =>
  text.length > MAX_SENSE_LENGTH ? `${text.slice(0, MAX_SENSE_LENGTH).trimEnd()}…` : text

// Label of a sense line; a lone "(n)" points to definition n, whose beginning is used
function senseLabel(line: string, definitions: string[]): string | null {
  const label = plainText(line.replace(/^[;:*#]+/, ''))
  const reference = DEFINITION_REFERENCE.exec(label)
  if (reference) {
    const definition = definitions[Number(reference[1]) - 1]
    return definition ? truncate(definition) : null
  }
  return label.replace(TRAILING_DEFINITION_REFERENCE, '') || null
}

// Top-level definitions of a part-of-speech section ("# …", not examples "#*")
const definitionsOf = (body: string) =>
  body
    .split('\n')
    .filter((line) => /^#(?![*:#])/.test(line))
    .map((line) => plainText(line.slice(1)))

type GroupEntry = { group: SynonymGroup; inline: boolean }

// Latest group of this sense that was not opened by an inline sense
function lastSharedGroup(entries: GroupEntry[], sense: string | null) {
  for (let i = entries.length - 1; i >= 0; i--) {
    if (!entries[i].inline && entries[i].group.sense === sense) return entries[i]
  }
  return undefined
}

type Line =
  { kind: 'sense'; sense: string } | { kind: 'words'; inlineSense: string | null; words: string[] }

// What a single line of a synonyms list says, or null if it says nothing usable
function classifyLine(raw: string, headword: string, definitions: string[]): Line | null {
  const line = raw.trim()
  if (!line || COLUMN_MARKER.test(line)) return null

  const links = linkedWords(line)
  // Sense headers first, even when they contain a link ("; Au sens de [[vitesse]] :")
  if (SENSE_HEADER.test(line) || (!links.length && !line.startsWith('*'))) {
    const sense = senseLabel(line, definitions)
    return sense ? { kind: 'sense', sense } : null
  }

  const words = links.filter((word) => word.toLowerCase() !== headword)
  // A bullet with no other word ("* {{voir thésaurus|…}}", "* [[headword]]") says nothing
  if (!words.length) return null

  const inline = INLINE_SENSE.exec(line)
  return {
    kind: 'words',
    inlineSense: inline ? plainText(inline[1]).replace(/^\((.*)\)$/, '$1') : null,
    words,
  }
}

/*
 * Folds classified lines into groups. A sense line sets the sense of the lines that follow; an
 * inline sense applies to its own line only, in a group of its own.
 */
function groupLines(lines: Line[], partOfSpeech: PartOfSpeech): SynonymGroup[] {
  const entries: GroupEntry[] = []
  let currentSense: string | null = null

  for (const line of lines) {
    if (line.kind === 'sense') {
      currentSense = line.sense
      continue
    }
    const inline = line.inlineSense !== null
    const sense = line.inlineSense ?? currentSense
    let entry = inline ? undefined : lastSharedGroup(entries, sense)
    if (!entry) {
      entry = { group: { partOfSpeech, sense, words: [] }, inline }
      entries.push(entry)
    }
    for (const word of line.words) {
      if (!entry.group.words.includes(word)) entry.group.words.push(word)
    }
  }
  return entries.map((entry) => entry.group)
}

export function parseWiktionaryPage(wikitext: string, headword: string): ParsedPage {
  const french = FRENCH_SECTION.exec(wikitext)?.[1] ?? ''
  const parsed: ParsedPage = { synonyms: [], lemma: null }
  let partOfSpeech: PartOfSpeech | null = null
  let definitions: string[] = []

  for (const section of sections(french)) {
    if (section.level === POS_LEVEL) {
      partOfSpeech = section.name ? (POS_BY_SECTION[section.name.split(' ')[0]] ?? null) : null
      definitions = definitionsOf(section.body)
      // Inflected form: the first definition links to the base form
      if (partOfSpeech && section.params.includes('flexion') && !parsed.lemma) {
        const firstDefinition = section.body.split('\n').find((line) => /^#(?![*:#])/.test(line))
        parsed.lemma = firstDefinition ? (linkedWords(firstDefinition)[0] ?? null) : null
      }
      continue
    }
    if (!partOfSpeech || !section.name || !SYNONYM_SECTIONS.has(section.name)) continue

    const lines = section.body
      .split('\n')
      .map((line) => classifyLine(line, headword, definitions))
      .filter((line): line is Line => line !== null)
    parsed.synonyms.push(...groupLines(lines, partOfSpeech))
  }
  return parsed
}
