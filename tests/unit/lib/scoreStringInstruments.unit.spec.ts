import { describe, expect, it } from 'vitest'

import { adaptToInstrument, inspectScore, INSTRUMENTS } from '@/lib/scores'
import { SAMPLE_SCORE } from '@/lib/scores/sample'
import { scoreVariantTitle } from '@/lib/scores/variantTitle'

const read = (xml: string) => new DOMParser().parseFromString(xml, 'application/xml')

describe('guitar and bass transposition', () => {
  it.each(['guitar', 'bass'] as const)(
    'preserves sounding pitch with written octave metadata for %s',
    (instrument) => {
      const output = adaptToInstrument(SAMPLE_SCORE, instrument, 'concert')
      expect(inspectScore(output)[0].pitch).toEqual({ step: 'G', alter: 0, octave: 5 })
      const document = read(output)
      expect(document.querySelector('transpose > chromatic')?.textContent).toBe('0')
      expect(document.querySelector('transpose > octave-change')?.textContent).toBe('-1')
      expect(document.querySelector('clef > sign')?.textContent).toBe(
        instrument === 'bass' ? 'F' : 'G',
      )
      expect(document.querySelector('clef > line')?.textContent).toBe(
        instrument === 'bass' ? '4' : '2',
      )
      expect(document.querySelector('clef-octave-change')).toBeNull()
      expect(document.querySelector('key > fifths')?.textContent).toBe('0')
      expect(inspectScore(adaptToInstrument(output, 'concert'))[0].pitch).toEqual(
        inspectScore(SAMPLE_SCORE)[0].pitch,
      )
      expect(scoreVariantTitle('Study', { mode: 'instrument', instrument }, output)).toBe(
        `Study (${INSTRUMENTS[instrument].code})`,
      )
    },
  )

  it('converts guitar to bass and back without accumulating octaves', () => {
    const guitar = adaptToInstrument(SAMPLE_SCORE, 'guitar', 'concert')
    const bass = adaptToInstrument(guitar, 'bass')
    const restored = adaptToInstrument(bass, 'guitar')
    expect(inspectScore(restored).map((note) => note.pitch)).toEqual(
      inspectScore(guitar).map((note) => note.pitch),
    )
    expect(read(restored).querySelectorAll('transpose')).toHaveLength(1)
    const trumpet = adaptToInstrument(bass, 'trumpet-bb')
    expect(read(trumpet).querySelector('clef > sign')?.textContent).toBe('G')
    expect(inspectScore(adaptToInstrument(trumpet, 'concert'))[0].pitch).toEqual(
      inspectScore(SAMPLE_SCORE)[0].pitch,
    )
  })

  it('reads octave-only exports where optional diatonic metadata is omitted', () => {
    const guitar = adaptToInstrument(SAMPLE_SCORE, 'guitar', 'concert').replace(
      '<diatonic>0</diatonic>',
      '',
    )
    expect(inspectScore(adaptToInstrument(guitar, 'concert'))[0].pitch).toEqual(
      inspectScore(SAMPLE_SCORE)[0].pitch,
    )
  })

  it('accepts guitar polyphony on a single staff', () => {
    const xml = SAMPLE_SCORE.replace(
      '</measure>',
      '<backup><duration>40320</duration></backup><note><rest/><duration>40320</duration><voice>2</voice></note></measure>',
    )
    expect(() => adaptToInstrument(xml, 'guitar', 'concert')).not.toThrow()
  })

  it('normalizes sounding pitches encoded with an octave clef only once', () => {
    const xml = SAMPLE_SCORE.replace(
      '<line>2</line>',
      '<line>2</line><clef-octave-change>-1</clef-octave-change>',
    )
    const guitar = adaptToInstrument(xml, 'guitar', 'guitar')
    expect(inspectScore(guitar)[0].pitch.octave).toBe(5)
    expect(read(guitar).querySelector('clef-octave-change')).toBeNull()
    expect(inspectScore(adaptToInstrument(guitar, 'concert'))[0].pitch.octave).toBe(4)
  })

  it('refuses ambiguous octave encodings and tablature instead of corrupting them', () => {
    const guitar = adaptToInstrument(SAMPLE_SCORE, 'guitar', 'concert').replace(
      '<line>2</line>',
      '<line>2</line><clef-octave-change>-1</clef-octave-change>',
    )
    expect(() => adaptToInstrument(guitar, 'bass')).toThrow('unsupportedTranspose')
    expect(() =>
      adaptToInstrument(
        SAMPLE_SCORE.replace('<sign>G</sign>', '<sign>TAB</sign>'),
        'guitar',
        'concert',
      ),
    ).toThrow('unsupportedTranspose')
  })
})
