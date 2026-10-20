import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'

import { addNote, deleteNote, inspectNoteEditing } from '@/lib/scores/notes'
import { appendMeasure } from '@/lib/scores/measures'
import { indexScore } from '@/lib/scores/indexScore'
import { inspectScore, validateScoreImport } from '@/lib/scores'
import { SAMPLE_SCORE } from '@/lib/scores/sample'

const empty = appendMeasure(SAMPLE_SCORE)
const read = (xml: string) => new DOMParser().parseFromString(xml, 'application/xml')
const lastEvents = (xml: string) => indexScore(xml).measures.at(-1)?.events
const emptyRest = '<note><rest measure="yes"/><duration>40320</duration></note>'

it('fills an appended measure repeatedly without moving its rhythm or changing existing content', () => {
  let xml = empty
  const original = read(empty)
  for (let count = 1; count <= 4; count++) {
    xml = addNote(xml, 2)
    expect(inspectScore(xml)).toHaveLength(7 + count)
    expect(
      lastEvents(xml)
        ?.filter((event) => event.kind === 'notes')
        .map((event) => event.position.onset),
    ).toEqual(Array.from({ length: count }, (_, numerator) => ({ numerator, denominator: 1 })))
    expect(read(xml).querySelector('divisions')?.textContent).toBe('10080')
    expect(read(xml).querySelectorAll('measure')[2].querySelector('[measure="yes"]')).toBeNull()
  }
  expect(lastEvents(xml)?.map((event) => event.duration)).toEqual(
    Array(4).fill({ numerator: 1, denominator: 1 }),
  )
  for (const index of [0, 1]) {
    expect(read(xml).querySelectorAll('measure')[index].outerHTML).toBe(
      original.querySelectorAll('measure')[index].outerHTML,
    )
  }
  expect(inspectNoteEditing(xml).addableMeasures).toEqual([])
  expect(() => addNote(xml, 2)).toThrow('noNoteSpace')
  expect(() => validateScoreImport(xml)).not.toThrow()
})

it('deletes to an equal rest, reuses the space and preserves other notes and indices', () => {
  const added = addNote(addNote(empty, 2), 2)
  const removed = deleteNote(added, 7)
  expect(lastEvents(removed)?.map((event) => [event.kind, event.position.onset])).toEqual([
    ['rest', { numerator: 0, denominator: 1 }],
    ['notes', { numerator: 1, denominator: 1 }],
    ['rest', { numerator: 2, denominator: 1 }],
  ])
  expect(inspectScore(removed)[7].pitch).toEqual({ step: 'C', alter: 0, octave: 4 })
  expect(lastEvents(addNote(removed, 2))?.filter((event) => event.kind === 'notes')).toHaveLength(2)
})

it.each([
  [5040, 'eighth', false],
  [7560, 'eighth', true],
  [10080, 'quarter', false],
] as const)('uses the available short rest duration %s exactly', (duration, type, dotted) => {
  const xml = empty.replace(
    emptyRest,
    `<note><rest/><duration>${duration}</duration><voice>1</voice><staff>1</staff></note>`,
  )
  const result = read(addNote(xml, 2)).querySelectorAll('measure')[2].querySelector('note')!
  expect(result.querySelector('duration')?.textContent).toBe(String(duration))
  expect(result.querySelector('type')?.textContent).toBe(type)
  expect(result.querySelector('dot') !== null).toBe(dotted)
  expect(Array.from(result.children, (child) => child.localName)).toEqual([
    'pitch',
    'duration',
    'voice',
    'type',
    ...(dotted ? ['dot'] : []),
    'accidental',
    'staff',
  ])
})

it.each(['7', '-7'])('adds natural C4 with an explicit natural in key %s', (fifths) => {
  const xml = addNote(empty.replace('<fifths>0</fifths>', `<fifths>${fifths}</fifths>`), 2)
  const note = read(xml).querySelectorAll('measure')[2].querySelector('note')!
  expect(note.querySelector('pitch')?.textContent).toBe('C4')
  expect(note.querySelector('accidental')?.textContent).toBe('natural')
})

it('does not enable addition when the first rest cannot be represented without rounding', () => {
  const xml = empty.replace(
    emptyRest,
    '<note><rest/><duration>1</duration></note><note><rest/><duration>10080</duration></note>',
  )
  expect(inspectNoteEditing(xml).addableMeasures).toEqual([])
  expect(() => addNote(xml, 2)).toThrow('unsupportedNoteStructure')
})

it.each(['beam', 'tie', 'notations', 'lyric'])(
  'guards unsupported note field %s without changing XML',
  (field) => {
    const xml = empty.replace('<stem>up</stem>', `<${field}>begin</${field}>`)
    expect(() => inspectNoteEditing(xml)).toThrow('unsupportedNoteStructure')
    expect(() => addNote(xml, 2)).toThrow('unsupportedNoteStructure')
    expect(() => deleteNote(xml, 0)).toThrow('unsupportedNoteStructure')
  },
)

it.each(['polyphonic-piano', 'voices-triplet'])(
  'guards complex imported structure %s',
  (fixture) => {
    const xml = readFileSync(`tests/fixtures/scores/${fixture}.musicxml`, 'utf8')
    expect(() => addNote(xml, 0)).toThrow('unsupportedNoteStructure')
    expect(() => deleteNote(xml, 0)).toThrow('unsupportedNoteStructure')
  },
)

it('reports missing note and measure indices without editing another event', () => {
  expect(() => addNote(empty, -1)).toThrow('measureMissing')
  expect(() => deleteNote(empty, 99)).toThrow('noteMissing')
})

it('refuses IDs that could be referenced instead of dropping them during replacement', () => {
  const xml = empty.replace(
    '<note><rest measure="yes"',
    '<note id="referenced-note"><rest measure="yes"',
  )
  expect(() => addNote(xml, 2)).toThrow('unsupportedNoteStructure')
})
