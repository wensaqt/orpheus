import { describe, expect, it } from 'vitest'

import { createKaikkiCollector, extractRecord, mayContribute } from '@/lib/thesaurus/kaikki'

describe('extractRecord', () => {
  it('groups entry- and sense-level synonyms by sense', () => {
    const extracted = extractRecord({
      word: 'Rapide',
      lang_code: 'fr',
      pos: 'adj',
      synonyms: [{ word: 'prompt' }, { word: 'vif', sense: '(1)' }],
      senses: [
        { glosses: ['Qui se meut avec vitesse.'], synonyms: [{ word: 'véloce' }] },
        { glosses: ['Qui dure peu.'] },
      ],
    })
    expect(extracted).toEqual({
      word: 'rapide',
      partOfSpeech: 'adjective',
      lemmas: [],
      groups: [
        { partOfSpeech: 'adjective', sense: null, words: ['prompt'] },
        { partOfSpeech: 'adjective', sense: 'Qui se meut avec vitesse.', words: ['vif', 'véloce'] },
      ],
    })
  })

  it('cleans raw definition markers from sense labels', () => {
    const extracted = extractRecord({
      word: 'cheval',
      lang_code: 'fr',
      pos: 'noun',
      synonyms: [{ word: 'canasson', sense: 'Animal (1) :' }],
    })
    expect(extracted?.groups[0].sense).toBe('Animal')
  })

  it('keeps the base form of an inflected form, with its part of speech', () => {
    const extracted = extractRecord({
      word: 'marchait',
      lang_code: 'fr',
      pos: 'verb',
      senses: [{ glosses: ['Troisième personne…'], form_of: [{ word: 'marcher' }] }],
    })
    expect(extracted).toMatchObject({ word: 'marchait', partOfSpeech: 'verb', lemmas: ['marcher'] })
  })

  it('ignores other languages, unsupported parts of speech and non-words', () => {
    expect(
      extractRecord({ word: 'fast', lang_code: 'en', pos: 'adj', synonyms: [{ word: 'quick' }] }),
    ).toBeNull()
    expect(
      extractRecord({ word: 'Paris', lang_code: 'fr', pos: 'name', synonyms: [{ word: 'x' }] }),
    ).toBeNull()
    const extracted = extractRecord({
      word: 'vif',
      lang_code: 'fr',
      pos: 'adj',
      synonyms: [
        { word: 'Thésaurus:vitesse' },
        { word: 'vif' },
        { word: 'x'.repeat(61) },
        { word: 'agile' },
      ],
    })
    expect(extracted?.groups.flatMap((group) => group.words)).toEqual(['agile'])
  })

  it('mayContribute skips lines without synonyms or base forms', () => {
    expect(mayContribute('{"word": "x", "senses": []}')).toBe(false)
    expect(mayContribute('{"word": "x", "synonyms": []}')).toBe(true)
  })
})

describe('createKaikkiCollector', () => {
  it('merges records of the same word and keeps useful inflected forms only', () => {
    const collector = createKaikkiCollector()
    collector.add({
      word: 'parler',
      partOfSpeech: 'verb',
      groups: [{ partOfSpeech: 'verb', sense: null, words: ['causer'] }],
      lemmas: [],
    })
    collector.add({
      word: 'parler',
      partOfSpeech: 'noun',
      groups: [{ partOfSpeech: 'noun', sense: null, words: ['patois'] }],
      lemmas: [],
    })
    collector.add({ word: 'parlions', partOfSpeech: 'verb', groups: [], lemmas: ['parler'] })
    collector.add({ word: 'zyeutions', partOfSpeech: 'verb', groups: [], lemmas: ['zyeuter'] })
    collector.add({ word: 'tardions', partOfSpeech: 'verb', groups: [], lemmas: ['tarder'] })

    const entries = collector.entries((word) => word === 'tarder')
    expect(entries.map((entry) => entry.word).sort()).toEqual(['parler', 'parlions', 'tardions'])
    expect(entries.find((e) => e.word === 'parler')?.groups).toHaveLength(2)
    expect(entries.find((e) => e.word === 'parlions')).toMatchObject({
      groups: [],
      lemma: 'parler',
      lemmaPartOfSpeech: 'verb',
    })
  })
})
