import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

import {
  adaptToInstrument,
  correctPitch,
  hasInstrumentTranspose,
  inspectScore,
  INTERVALS,
  transposeKey,
  validateScoreImport,
} from '@/lib/scores/prototype'
import { SAMPLE_SCORE } from '@/lib/scores/sample'

const read = (xml: string) => new DOMParser().parseFromString(xml, 'application/xml')
const polyphonicPiano = readFileSync('tests/fixtures/scores/polyphonic-piano.musicxml', 'utf8')
const voicesTriplet = readFileSync('tests/fixtures/scores/voices-triplet.musicxml', 'utf8')

describe('MusicXML prototype', () => {
  it('corrects a note and keeps it in exportable MusicXML', () => {
    const corrected = correctPitch(SAMPLE_SCORE, 0, { step: 'G', alter: 1, octave: 4 })
    expect(inspectScore(corrected)[0].pitch).toEqual({ step: 'G', alter: 1, octave: 4 })
    const note = read(corrected).querySelector('part > measure > note')
    expect(note?.querySelector('pitch > alter')?.textContent).toBe('1')
    expect(note?.querySelector('accidental')?.textContent).toBe('sharp')
    expect(corrected.indexOf('<alter>')).toBeLessThan(corrected.indexOf('<octave>'))
  })

  it('moves notes, key, chord root and chord bass while retaining durations', () => {
    const transposed = transposeKey(SAMPLE_SCORE, INTERVALS[1])
    const document = read(transposed)
    expect(inspectScore(transposed)[0].pitch).toEqual({ step: 'A', alter: 0, octave: 4 })
    expect(document.querySelector('key > fifths')?.textContent).toBe('2')
    expect(document.querySelector('harmony > root > root-step')?.textContent).toBe('D')
    expect(document.querySelector('harmony > bass > bass-step')?.textContent).toBe('F')
    expect(document.querySelector('harmony > bass > bass-alter')?.textContent).toBe('1')
    expect(
      Array.from(document.querySelectorAll('note > duration'), (duration) => duration.textContent),
    ).toEqual(
      Array.from(
        read(SAMPLE_SCORE).querySelectorAll('note > duration'),
        (duration) => duration.textContent,
      ),
    )
  })

  it('writes a tenor sax part with sounding octave metadata', () => {
    const output = adaptToInstrument(SAMPLE_SCORE, 'tenor-sax-bb', 'concert')
    const document = read(output)
    expect(document.querySelector('transpose > diatonic')?.textContent).toBe('-1')
    expect(document.querySelector('transpose > chromatic')?.textContent).toBe('-2')
    expect(document.querySelector('transpose > octave-change')?.textContent).toBe('-1')
    expect(inspectScore(output)[0].pitch).toEqual({ step: 'A', alter: 0, octave: 5 })
  })

  it('rejects multiple parts before changing the document', () => {
    const invalid = SAMPLE_SCORE.replace('</score-partwise>', '<part id="P2"/></score-partwise>')
    expect(() => transposeKey(invalid, INTERVALS[1])).toThrow('plusieurs parties instrumentales')
  })

  it('transposes both staves of a polyphonic piano without changing their rhythms', () => {
    expect(() => validateScoreImport(polyphonicPiano)).not.toThrow()
    expect(() => inspectScore(polyphonicPiano)).toThrow('<backup>')
    const transposed = transposeKey(polyphonicPiano, INTERVALS[1])
    const original = read(polyphonicPiano)
    const result = read(transposed)
    expect(
      Array.from(result.querySelectorAll('note > pitch > step'), (node) => node.textContent),
    ).toEqual(['D', 'E', 'F', 'G', 'D'])
    expect(result.querySelectorAll('note > pitch > alter')).toHaveLength(1)
    expect(result.querySelector('key > fifths')?.textContent).toBe('2')
    expect(result.querySelector('backup')?.textContent).toBe(
      original.querySelector('backup')?.textContent,
    )
    expect(
      Array.from(result.querySelectorAll('note > duration'), (node) => node.textContent),
    ).toEqual(Array.from(original.querySelectorAll('note > duration'), (node) => node.textContent))
    expect(() => adaptToInstrument(polyphonicPiano, 'tenor-sax-bb', 'concert')).toThrow(
      'plusieurs voix ou portées',
    )
  })

  it('changes key twice while preserving instrument transposition metadata', () => {
    const written = adaptToInstrument(SAMPLE_SCORE, 'trumpet-bb', 'concert')
    expect(() => validateScoreImport(written)).not.toThrow()
    expect(() => inspectScore(written)).not.toThrow()
    const once = transposeKey(written, INTERVALS[1])
    const twice = transposeKey(once, INTERVALS[1])
    expect(inspectScore(twice)[0].pitch).toEqual({ step: 'C', alter: 1, octave: 5 })
    expect(read(twice).querySelector('transpose > chromatic')?.textContent).toBe('-2')
  })

  it('converts an already transposed part through multiple instruments without changing its sound', () => {
    const trumpet = adaptToInstrument(SAMPLE_SCORE, 'trumpet-bb', 'concert')
    const tenor = adaptToInstrument(trumpet, 'tenor-sax-bb')
    const alto = adaptToInstrument(tenor, 'alto-sax-eb')
    const concert = adaptToInstrument(alto, 'concert')

    expect(inspectScore(trumpet)[0].pitch).toEqual({ step: 'A', alter: 0, octave: 4 })
    expect(inspectScore(tenor)[0].pitch).toEqual({ step: 'A', alter: 0, octave: 5 })
    expect(inspectScore(alto)[0].pitch).toEqual({ step: 'E', alter: 0, octave: 5 })
    expect(inspectScore(concert)[0].pitch).toEqual(inspectScore(SAMPLE_SCORE)[0].pitch)
    expect(read(tenor).querySelectorAll('transpose')).toHaveLength(1)
    expect(read(concert).querySelector('transpose')).toBeNull()
  })

  it('rejects an instrument offset that changes midway through a score', () => {
    const trumpet = adaptToInstrument(SAMPLE_SCORE, 'trumpet-bb', 'concert')
    const changed = trumpet.replace(
      '</measure>',
      '</measure><measure number="2"><attributes><transpose><diatonic>-5</diatonic><chromatic>-9</chromatic></transpose></attributes></measure>',
    )
    expect(() => adaptToInstrument(changed, 'concert')).toThrow('change dans la partition')
  })

  it('preserves tuplet timing when changing key', () => {
    const tuplet = SAMPLE_SCORE.replace(
      '<type>quarter</type>',
      '<type>quarter</type><time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>',
    )
    expect(() => validateScoreImport(tuplet)).not.toThrow()
    const transposed = read(transposeKey(tuplet, INTERVALS[1]))
    expect(transposed.querySelector('time-modification > actual-notes')?.textContent).toBe('3')
    expect(transposed.querySelector('time-modification > normal-notes')?.textContent).toBe('2')
  })

  it('keeps chords, voices, forward and tuplets at their original times', () => {
    const original = read(voicesTriplet)
    const transposed = read(transposeKey(voicesTriplet, INTERVALS[1]))
    const events =
      'note > duration, note > voice, note > type, note > chord, time-modification, backup, forward'
    expect(Array.from(transposed.querySelectorAll(events), (node) => node.outerHTML)).toEqual(
      Array.from(original.querySelectorAll(events), (node) => node.outerHTML),
    )
    expect(
      Array.from(transposed.querySelectorAll('note > pitch > step'), (node) => node.textContent),
    ).toEqual(['D', 'F', 'E', 'F', 'G', 'B'])
    const restored = read(
      transposeKey(new XMLSerializer().serializeToString(transposed), INTERVALS[7]),
    )
    expect(
      Array.from(restored.querySelectorAll('note > pitch'), (node) => node.textContent),
    ).toEqual(Array.from(original.querySelectorAll('note > pitch'), (node) => node.textContent))
  })

  it('requires an explicit source instrument only when MusicXML has no transposition', () => {
    expect(hasInstrumentTranspose(SAMPLE_SCORE)).toBe(false)
    expect(() => adaptToInstrument(SAMPLE_SCORE, 'trumpet-bb')).toThrow('instrument source')
    const trumpet = adaptToInstrument(SAMPLE_SCORE, 'trumpet-bb', 'concert')
    expect(hasInstrumentTranspose(trumpet)).toBe(true)
    expect(() => adaptToInstrument(trumpet, 'concert')).not.toThrow()
    expect(inspectScore(adaptToInstrument(SAMPLE_SCORE, 'concert', 'trumpet-bb'))[0].pitch).toEqual(
      {
        step: 'F',
        alter: 0,
        octave: 4,
      },
    )
  })
})
