import { describe, expect, it } from 'vitest'

import { parseWiktionaryPage } from '@front/_features/lexicon/wiktionary'

import { wiktionaryFixture } from '../../helpers/fixtures'

const parse = (word: string) => parseWiktionaryPage(wiktionaryFixture(word), word)
const words = (groups: { words: string[] }[]) => groups.flatMap((group) => group.words)

// Minimal page: one French adjective section followed by a synonyms subsection
const page = (...synonymLines: string[]) =>
  [
    '== {{langue|fr}} ==',
    '=== {{S|adjectif|fr}} ===',
    '# Qui se meut avec vitesse.',
    '# Qui dure peu.',
    '==== {{S|synonymes}} ====',
    ...synonymLines,
  ].join('\n')

const synonymsOf = (wikitext: string, headword = 'rapide') =>
  parseWiktionaryPage(wikitext, headword).synonyms

describe('parseWiktionaryPage — real pages', () => {
  it('reads synonyms grouped by part of speech', () => {
    const { synonyms, lemma } = parse('rapide')
    expect(lemma).toBeNull()
    expect(synonyms[0]).toMatchObject({ partOfSpeech: 'adjective', sense: null })
    expect(synonyms[0].words).toEqual(expect.arrayContaining(['bref', 'prompt', 'véloce']))
    expect(synonyms.some((group) => group.partOfSpeech === 'noun')).toBe(true)
  })

  it('never returns the word itself, duplicates or bullet-only senses', () => {
    for (const word of ['rapide', 'doux', 'clair', 'amour', 'heureux']) {
      for (const group of parse(word).synonyms) {
        expect(group.words).not.toContain(word)
        expect(new Set(group.words).size).toBe(group.words.length)
        expect(group.sense ?? '').not.toMatch(/^[*#;:]/)
      }
    }
  })

  it('detects the base form of inflected forms', () => {
    expect(parse('rapides')).toEqual({ synonyms: [], lemma: 'rapide' })
    expect(parse('marchait').lemma).toBe('marcher')
  })

  it(`labels senses introduced by ": ''…'' (n) :"`, () => {
    const touch = parse('doux').synonyms.find((group) => group.sense === 'Agréable au toucher')
    expect(touch?.words).toContain('soyeux')
  })

  it('replaces a "(1)" reference with the matching definition', () => {
    const [group] = parse('heureux').synonyms
    expect(group.sense).toMatch(/^Qui jouit du bonheur/)
    expect(group.words).toEqual(expect.arrayContaining(['content', 'ravi', 'joyeux']))
  })

  it('files near-synonyms with synonyms, {{lien|…}} links included', () => {
    expect(words(parse('amour').synonyms)).toEqual(
      expect.arrayContaining(['adoration', 'affection']),
    )
  })
})

describe('parseWiktionaryPage — list lines', () => {
  it('ignores bullets that link nothing but the headword or a thesaurus', () => {
    const groups = synonymsOf(page('* {{voir thésaurus|fr|vitesse}}', '* [[rapide]]', '* [[vif]]'))
    expect(groups).toEqual([{ partOfSpeech: 'adjective', sense: null, words: ['vif'] }])
  })

  it('compares the headword case-insensitively', () => {
    expect(words(synonymsOf(page('* [[Rapide]], [[vif]]')))).toEqual(['vif'])
  })

  it('keeps a sense line as a sense even when it contains a link', () => {
    const groups = synonymsOf(page('; Au sens de [[vitesse]] :', '* [[vif]]'))
    expect(groups).toEqual([
      { partOfSpeech: 'adjective', sense: 'Au sens de vitesse', words: ['vif'] },
    ])
  })

  it('applies an inline sense to its own line only', () => {
    const groups = synonymsOf(page("* ''(bref)'' : [[court]]", '* [[vif]]'))
    expect(groups).toEqual([
      { partOfSpeech: 'adjective', sense: 'bref', words: ['court'] },
      { partOfSpeech: 'adjective', sense: null, words: ['vif'] },
    ])
  })

  it('maps "(2)" to the second definition', () => {
    const [group] = synonymsOf(page('(2)', '* [[fugace]]'))
    expect(group.sense).toBe('Qui dure peu.')
  })

  it('reads {{l|…}} and {{cf|…}}, but not {{lien|…|frm}} (Middle French)', () => {
    expect(
      words(synonymsOf(page('* {{l|vif|fr}}, {{cf|lang=fr|prompt}}, {{lien|isnel|frm}}'))),
    ).toEqual(['vif', 'prompt'])
  })
})

describe('parseWiktionaryPage — sections', () => {
  it('stops a synonyms list at any following header, {{S|…}} or not', () => {
    const wikitext = page('* [[vif]]', '==== Notes ====', '* [[lent]]')
    expect(words(synonymsOf(wikitext))).toEqual(['vif'])
  })

  it('reads a synonyms header followed by an HTML comment', () => {
    const wikitext = page().replace(
      '==== {{S|synonymes}} ====',
      '==== {{S|synonymes}} ==== <!-- à compléter -->\n* [[vif]]',
    )
    expect(words(synonymsOf(wikitext))).toEqual(['vif'])
  })

  it('recognises multi-word and abbreviated parts of speech', () => {
    for (const [section, partOfSpeech] of [
      ['pronom personnel', 'pronoun'],
      ['adverbe interrogatif', 'adverb'],
      ['adj', 'adjective'],
    ]) {
      const wikitext = page('* [[vif]]').replace('{{S|adjectif|fr}}', `{{S|${section}|fr}}`)
      expect(synonymsOf(wikitext)[0]?.partOfSpeech).toBe(partOfSpeech)
    }
  })

  it('finds the base form whatever the link syntax', () => {
    const inflected = (definition: string) =>
      parseWiktionaryPage(
        ['== {{langue|fr}} ==', '=== {{S|nom|fr|flexion}} ===', definition].join('\n'),
        'chevaux',
      ).lemma
    expect(inflected("# ''Pluriel de'' {{lien|cheval|fr}}.")).toBe('cheval')
    expect(inflected("# ''Féminin singulier d'''[[amer]].")).toBe('amer')
  })

  it('ignores other languages and links outside the main namespace', () => {
    const wikitext = [
      page('* [[vif]], [[Thésaurus:vitesse/français|vitesse]], [[w:Rapide]]'),
      '== {{langue|it}} ==',
      '=== {{S|adjectif|it}} ===',
      '==== {{S|synonymes}} ====',
      '* [[veloce]]',
    ].join('\n')
    expect(words(synonymsOf(wikitext))).toEqual(['vif'])
  })

  it('returns nothing for a page without a French section', () => {
    expect(parseWiktionaryPage('== {{langue|en}} ==\n', 'fast')).toEqual({
      synonyms: [],
      lemma: null,
    })
  })
})
