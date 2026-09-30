import { describe, expect, it } from 'vitest'

import { parseWiktionaryPage } from '@front/_features/lexicon/wiktionary'

import { wiktionaryFixture } from '../../helpers/fixtures'

const parse = (word: string) => parseWiktionaryPage(wiktionaryFixture(word), word)
const words = (groups: { words: string[] }[]) => groups.flatMap((group) => group.words)

describe('parseWiktionaryPage', () => {
  it('reads synonyms and antonyms, grouped by part of speech', () => {
    const { groups, lemma } = parse('rapide')
    expect(lemma).toBeNull()
    expect(groups.synonyms[0]).toMatchObject({ partsOfSpeech: ['adjective'], sense: null })
    expect(groups.synonyms[0].words).toEqual(expect.arrayContaining(['bref', 'prompt', 'véloce']))
    expect(groups.synonyms.some((group) => group.partsOfSpeech[0] === 'noun')).toBe(true)
    expect(words(groups.antonyms)).toEqual(expect.arrayContaining(['lent', 'long']))
  })

  it('never returns the word itself or duplicates', () => {
    for (const word of ['rapide', 'doux', 'clair', 'amour', 'heureux']) {
      const { groups } = parse(word)
      for (const group of [...groups.synonyms, ...groups.antonyms]) {
        expect(group.words).not.toContain(word)
        expect(new Set(group.words).size).toBe(group.words.length)
      }
    }
  })

  it('detects the base form of inflected forms', () => {
    expect(parse('rapides')).toMatchObject({
      lemma: 'rapide',
      groups: { synonyms: [], antonyms: [] },
    })
    expect(parse('marchait').lemma).toBe('marcher')
  })

  it(`labels senses introduced by ": ''…'' (n) :"`, () => {
    const senses = parse('doux').groups.antonyms.map((group) => group.sense)
    expect(senses).toContain('Agréable au toucher')
    const touch = parse('doux').groups.antonyms.find((g) => g.sense === 'Agréable au toucher')
    expect(touch?.words).toEqual(expect.arrayContaining(['rugueux', 'rêche']))
  })

  it('replaces a "(1)" reference with the matching definition', () => {
    const [group] = parse('heureux').groups.synonyms
    expect(group.sense).toMatch(/^Qui jouit du bonheur/)
    expect(group.words).toEqual(expect.arrayContaining(['content', 'ravi', 'joyeux']))
  })

  it('recognises {{l|…}} and a sense written inline', () => {
    const [group] = parse('clair').groups.antonyms
    expect(group).toMatchObject({ sense: 'transparence', words: ['opaque', 'trouble'] })
  })

  it('files near-synonyms with synonyms, {{lien|…}} links included', () => {
    expect(words(parse('amour').groups.synonyms)).toEqual(
      expect.arrayContaining(['adoration', 'affection']),
    )
  })

  it('ignores other languages and links outside the main namespace', () => {
    const wikitext = [
      '== {{langue|fr}} ==',
      '=== {{S|adjectif|fr}} ===',
      '# Très vif.',
      '==== {{S|synonymes}} ====',
      '* [[vif]], [[Thésaurus:vitesse/français|vitesse]], [[w:Rapide]]',
      '== {{langue|it}} ==',
      '=== {{S|adjectif|it}} ===',
      '==== {{S|synonymes}} ====',
      '* [[veloce]]',
    ].join('\n')
    expect(words(parseWiktionaryPage(wikitext, 'rapide').groups.synonyms)).toEqual(['vif'])
  })

  it('returns empty groups for a page without a French section', () => {
    expect(parseWiktionaryPage('== {{langue|en}} ==\n', 'fast')).toEqual({
      groups: { synonyms: [], antonyms: [] },
      lemma: null,
    })
  })
})
