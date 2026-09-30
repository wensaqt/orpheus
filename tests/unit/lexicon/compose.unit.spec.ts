import { describe, expect, it } from 'vitest'

import { composeResult, EMPTY_RESULT, MORE_PER_GROUP } from '@front/_features/lexicon/compose'
import type { SynonymGroup } from '@front/_features/lexicon/types'

type PartOfSpeech = SynonymGroup['partOfSpeech']
const group = (words: string[], partOfSpeech: PartOfSpeech = 'verb'): SynonymGroup => ({
  partOfSpeech,
  sense: null,
  words,
})
const neighbours = (map: Record<string, string[]>) => (word: string) => map[word]

describe('composeResult', () => {
  it('leads with the Wiktionary and adds coherent Dicollecte suggestions', () => {
    const result = composeResult(
      'mettre',
      [
        { source: 'dicollecte', groups: [group(['poser', 'asseoir', 'guérir'])] },
        { source: 'wiktionary', groups: [group(['placer', 'poser'])] },
      ],
      { neighboursOf: neighbours({ asseoir: ['placer', 'poser'], guérir: ['soigner', 'mettre'] }) },
    )
    expect(result).toEqual({
      word: 'mettre',
      groups: [{ ...group(['placer', 'poser']), reliable: true }],
      more: [group(['asseoir'])],
      sourceUrl: 'https://fr.wiktionary.org/wiki/mettre',
    })
  })

  it('requires two shared curated words, so a single noisy link is not enough', () => {
    const result = composeResult(
      'heureux',
      [
        { source: 'wiktionary', groups: [group(['content', 'ravi', 'gai'], 'adjective')] },
        { source: 'dicollecte', groups: [group(['aise', 'toilettes'], 'adjective')] },
      ],
      {
        neighboursOf: neighbours({ aise: ['content', 'ravi'], toilettes: ['content', 'latrines'] }),
      },
    )
    expect(result.more).toEqual([group(['aise'], 'adjective')])
  })

  it('limits suggestions to MORE_PER_GROUP per group', () => {
    const many = Array.from({ length: 30 }, (_, i) => `mot${i}`)
    const result = composeResult(
      'x',
      [
        { source: 'wiktionary', groups: [group(['a', 'b'])] },
        { source: 'dicollecte', groups: [group(many)] },
      ],
      { neighboursOf: () => ['a', 'b'] },
    )
    expect(result.more[0].words).toHaveLength(MORE_PER_GROUP)
  })

  it('lets Dicollecte stand in, flagged, for parts of speech the Wiktionary lacks', () => {
    const result = composeResult(
      'parler',
      [
        { source: 'wiktionary', groups: [group(['patois'], 'noun')] },
        { source: 'dicollecte', groups: [group(['causer', 'bavarder'], 'verb')] },
      ],
      { preferredPartOfSpeech: 'verb' },
    )
    expect(result.groups).toEqual([
      { ...group(['causer', 'bavarder'], 'verb'), reliable: false },
      { ...group(['patois'], 'noun'), reliable: true },
    ])
  })

  it('uses all of Dicollecte, flagged, when the Wiktionary has nothing', () => {
    expect(
      composeResult('rare', [{ source: 'dicollecte', groups: [group(['insolite'])] }]),
    ).toEqual({
      word: 'rare',
      groups: [{ ...group(['insolite']), reliable: false }],
      more: [],
      sourceUrl: null,
    })
  })

  it('returns the empty result when no source has synonyms', () => {
    expect(composeResult('vide', [{ source: 'wiktionary', groups: [] }])).toEqual(EMPTY_RESULT)
  })
})
