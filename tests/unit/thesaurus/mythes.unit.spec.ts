import { describe, expect, it } from 'vitest'

import { parseMyThes } from '@/lib/thesaurus/mythes'

const thesaurus = (...lines: string[]) => ['UTF-8', ...lines].join('\n')

describe('parseMyThes', () => {
  it('keeps the main part of speech of a multi-part group, so a list is never shown twice', () => {
    expect(parseMyThes(thesaurus('rapide|1', '(Adjectif Nom)|vif|prompt'))).toEqual([
      {
        word: 'rapide',
        groups: [{ partOfSpeech: 'adjective', sense: null, words: ['vif', 'prompt'] }],
      },
    ])
  })

  it('merges groups of the same part of speech and removes duplicates', () => {
    const [entry] = parseMyThes(thesaurus('vif|2', '(Adjectif)|rapide|agile', '(adj)|agile|leste'))
    expect(entry.groups).toEqual([
      { partOfSpeech: 'adjective', sense: null, words: ['rapide', 'agile', 'leste'] },
    ])
  })

  it('normalises the headword and never lists it among its synonyms', () => {
    const [entry] = parseMyThes(thesaurus(' Rapide |1', '(Adjectif)|rapide|Rapide|vif'))
    expect(entry).toEqual({
      word: 'rapide',
      groups: [{ partOfSpeech: 'adjective', sense: null, words: ['vif'] }],
    })
  })

  it('files a group with an unknown part of speech as a noun', () => {
    const [entry] = parseMyThes(thesaurus('bof|1', '(?)|mouais'))
    expect(entry.groups[0].partOfSpeech).toBe('noun')
  })

  it('combines duplicate headwords and skips entries without synonyms', () => {
    const entries = parseMyThes(
      thesaurus('vif|1', '(Adjectif)|rapide', 'vide|1', '(Nom)|', 'vif|1', '(Nom)|entrain'),
    )
    expect(entries).toEqual([
      {
        word: 'vif',
        groups: [
          { partOfSpeech: 'adjective', sense: null, words: ['rapide'] },
          { partOfSpeech: 'noun', sense: null, words: ['entrain'] },
        ],
      },
    ])
  })

  it('ignores malformed entry lines', () => {
    expect(parseMyThes(thesaurus('garbage', 'ok|x', 'vif|1', '(Adjectif)|rapide'))).toHaveLength(1)
  })
})
