import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'

import {
  addFractions,
  compareFractions,
  fraction,
  fractionFromDivisions,
} from '@/lib/scores/fractions'
import { indexScore } from '@/lib/scores/indexScore'

const fixture = (name: string) =>
  readFileSync(join(process.cwd(), 'tests', 'fixtures', 'scores', name), 'utf8')

it('tracks tuplets, chords, backup and forward without merging voices', () => {
  const score = indexScore(fixture('voices-triplet.musicxml'))
  const events = score.measures[0].events
  expect(events).toHaveLength(5)
  expect(events[0].tones.map((tone) => tone.pitch.step)).toEqual(['C', 'E'])
  expect(new Set(events[0].tones.map((tone) => tone.id)).size).toBe(2)
  expect(events[0].position.onset).toEqual(fraction(0))
  expect(events[1].position.onset).toEqual(fraction(1, 3))
  expect(events[2].position.onset).toEqual(fraction(2, 3))
  expect(events[4].position.voiceId).toBe('2')
  expect(events[4].position.onset).toEqual(fraction(1))
})

it('keeps unison notes in separate voices and ignores repeated printed measure numbers as identity', () => {
  const xml = `<?xml version="1.0"?><score-partwise><part-list><score-part id="P1"><part-name>Voice</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>1</divisions></attributes><note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note><backup><duration>1</duration></backup><note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><voice>2</voice></note></measure><measure number="1"><note><rest/><duration>1</duration></note></measure></part></score-partwise>`
  const measures = indexScore(xml).measures
  expect(measures.map((measure) => measure.printedNumber)).toEqual(['1', '1'])
  expect(measures[0].events.map((event) => event.position.voiceId)).toEqual(['1', '2'])
  expect(measures[0].events.map((event) => event.position.onset)).toEqual([
    fraction(0),
    fraction(0),
  ])
  expect(new Set(measures.flatMap((measure) => measure.events.map((event) => event.id))).size).toBe(
    3,
  )
})

it('retains grace and unpitched events without advancing grace time', () => {
  const xml = `<?xml version="1.0"?><score-partwise><part-list><score-part id="P1"><part-name>Voice</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>1</divisions></attributes><note><grace/><pitch><step>C</step><octave>4</octave></pitch><type>eighth</type></note><note><unpitched><display-step>D</display-step><display-octave>5</display-octave></unpitched><duration>1</duration><type>quarter</type></note></measure></part></score-partwise>`
  const events = indexScore(xml).measures[0].events
  expect(events.map((event) => event.kind)).toEqual(['notes', 'unpitched'])
  expect(events.map((event) => event.position.onset)).toEqual([fraction(0), fraction(0)])
  expect(events[0].duration).toEqual(fraction(0))
})

it('keeps concurrent piano staves at the same musical time', () => {
  const score = indexScore(fixture('polyphonic-piano.musicxml'))
  const events = score.measures[0].events
  expect(new Set(events.map((event) => event.position.voiceId)).size).toBeGreaterThan(1)
  expect(
    events.some(
      (event) =>
        event.position.onset.numerator === 0 && event.tones.some((tone) => tone.staff === 2),
    ),
  ).toBe(true)
})

it('uses reduced exact fractions and refuses unsafe arithmetic', () => {
  expect(addFractions(fraction(1, 3), fractionFromDivisions(1, 6))).toEqual(fraction(1, 2))
  expect(compareFractions(fraction(2, 3), fraction(1, 2))).toBe(1)
  expect(() => addFractions(fraction(Number.MAX_SAFE_INTEGER), fraction(1))).toThrow(RangeError)
})
