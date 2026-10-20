import { ScoreError } from './errors'
import { compareFractions, fraction, subtractFractions, ZERO, type Fraction } from './fractions'
import { indexScore, type IndexedEvent, type ScoreIndex } from './indexScore'
import {
  findXmlChild,
  findXmlChildren,
  readXmlValue,
  serializeMusicXml,
  setXmlValue,
} from './musicXml'
import { validateScoreImport } from './validation'

const DEFAULT_NOTE_DURATION = fraction(1)
const MAX_REST_FRAGMENTS = 32
const NOTE_TYPES = [
  'maxima',
  'long',
  'breve',
  'whole',
  'half',
  'quarter',
  'eighth',
  '16th',
  '32nd',
  '64th',
  '128th',
  '256th',
  '512th',
  '1024th',
] as const
const NOTE_FIELDS = new Set([
  'pitch',
  'rest',
  'duration',
  'voice',
  'type',
  'dot',
  'accidental',
  'stem',
  'staff',
])
const UNSUPPORTED_STRUCTURE =
  'backup, forward, chord, grace, time-modification, unpitched, tie, tied, slur, glissando, slide, wedge, dashes, bracket, octave-shift, pedal, beam, repeat, ending, segno, coda, sound[dc], sound[ds], sound[tocoda], sound[fine]'
const QUARTER_NOTE_TYPE_INDEX = NOTE_TYPES.indexOf('quarter')
const DURATION_SHAPES = NOTE_TYPES.flatMap((type, index) => {
  const denominator = 2 ** Math.max(0, index - QUARTER_NOTE_TYPE_INDEX)
  const numerator = 2 ** Math.max(0, QUARTER_NOTE_TYPE_INDEX - index)
  return [
    { type, dotted: true, duration: fraction(numerator * 3, denominator * 2) },
    { type, dotted: false, duration: fraction(numerator, denominator) },
  ]
})
type DurationShape = (typeof DURATION_SHAPES)[number]

function assertSimpleStructure({ document }: ScoreIndex): void {
  if (
    findXmlChildren(document.documentElement, 'part').length !== 1 ||
    document.querySelector(UNSUPPORTED_STRUCTURE) ||
    document.querySelector('note[id], note [id]') ||
    Array.from(document.querySelectorAll('voice, staff, staves')).some(
      (node) => node.textContent?.trim() !== '1',
    ) ||
    Array.from(document.querySelectorAll('note')).some((note) =>
      Array.from(note.children).some((child) => !NOTE_FIELDS.has(child.localName)),
    )
  )
    throw new ScoreError('unsupportedNoteStructure')
}

function editableScore(xml: string): ScoreIndex {
  try {
    const score = indexScore(xml)
    assertSimpleStructure(score)
    return score
  } catch (cause) {
    if (cause instanceof ScoreError) throw cause
    const error = new ScoreError('unsupportedNoteStructure')
    error.cause = cause
    throw error
  }
}

function exactShape(duration: Fraction): DurationShape | undefined {
  return DURATION_SHAPES.find((shape) => compareFractions(shape.duration, duration) === 0)
}

function restShapes(duration: Fraction): DurationShape[] | null {
  const shapes: DurationShape[] = []
  let remaining = duration
  while (compareFractions(remaining, ZERO) > 0) {
    const shape = DURATION_SHAPES.find(
      (candidate) => compareFractions(candidate.duration, remaining) <= 0,
    )
    if (!shape || shapes.length === MAX_REST_FRAGMENTS) return null
    shapes.push(shape)
    remaining = subtractFractions(remaining, shape.duration)
  }
  return shapes
}

function addedNoteShapes(event: IndexedEvent): DurationShape[] | null {
  if (event.kind !== 'rest') return null
  const duration =
    compareFractions(event.duration, DEFAULT_NOTE_DURATION) < 0
      ? event.duration
      : DEFAULT_NOTE_DURATION
  const note = exactShape(duration)
  const rests = restShapes(subtractFractions(event.duration, duration))
  if (!note || !rests) return null
  const shapes = [note, ...rests]
  return shapes.every((shape) => durationDivisions(event, shape) !== null) ? shapes : null
}

function pitchedEvents(score: ScoreIndex): IndexedEvent[] {
  return score.measures.flatMap((measure) =>
    measure.events.filter((event) => event.kind === 'notes'),
  )
}

export function inspectNoteEditing(xml: string) {
  const score = editableScore(xml)
  return {
    addableMeasures: score.measures
      .filter((measure) => {
        const rest = measure.events.find((event) => event.kind === 'rest')
        return rest !== undefined && addedNoteShapes(rest) !== null
      })
      .map((measure) => measure.index),
    deletableNotes: pitchedEvents(score).flatMap((event, index) =>
      exactShape(event.duration) ? [index] : [],
    ),
  }
}

function durationDivisions(event: IndexedEvent, shape: DurationShape): number | null {
  const sourceDuration = Number(readXmlValue(event.source, 'duration'))
  const numerator =
    shape.duration.numerator *
    (sourceDuration / event.duration.numerator) *
    event.duration.denominator
  const duration = numerator / shape.duration.denominator
  return Number.isSafeInteger(numerator) && Number.isSafeInteger(duration) && duration > 0
    ? duration
    : null
}

function createReplacement(event: IndexedEvent, shape: DurationShape, pitched: boolean): Element {
  const source = event.source
  const document = source.ownerDocument
  const note = document.createElementNS(source.namespaceURI, 'note')
  const duration = durationDivisions(event, shape)
  if (duration === null) throw new ScoreError('unsupportedNoteStructure')
  const content = document.createElementNS(source.namespaceURI, pitched ? 'pitch' : 'rest')
  if (pitched) {
    setXmlValue(content, 'step', 'C')
    setXmlValue(content, 'octave', '4')
  }
  note.append(content)
  setXmlValue(note, 'duration', String(duration))
  const voice = findXmlChild(source, 'voice')
  if (voice) note.append(voice.cloneNode(true))
  setXmlValue(note, 'type', shape.type)
  if (shape.dotted) note.append(document.createElementNS(source.namespaceURI, 'dot'))
  // C4 is natural even under a key signature or an earlier accidental in this measure.
  if (pitched) setXmlValue(note, 'accidental', 'natural')
  const staff = findXmlChild(source, 'staff')
  if (staff) note.append(staff.cloneNode(true))
  return note
}

function serializeEditedScore(score: ScoreIndex): string {
  const xml = serializeMusicXml(score.document)
  validateScoreImport(xml)
  return xml
}

export function addNote(xml: string, measureIndex: number): string {
  const score = editableScore(xml)
  const measure = score.measures.find((candidate) => candidate.index === measureIndex)
  if (!measure) throw new ScoreError('measureMissing')
  const rest = measure.events.find((event) => event.kind === 'rest')
  if (!rest) throw new ScoreError('noNoteSpace')
  const shapes = addedNoteShapes(rest)
  if (!shapes) throw new ScoreError('unsupportedNoteStructure')
  rest.source.replaceWith(
    ...shapes.map((shape, index) => createReplacement(rest, shape, index === 0)),
  )
  return serializeEditedScore(score)
}

export function deleteNote(xml: string, noteIndex: number): string {
  const score = editableScore(xml)
  const event = pitchedEvents(score)[noteIndex]
  if (!event) throw new ScoreError('noteMissing')
  const shape = exactShape(event.duration)
  if (!shape) throw new ScoreError('unsupportedNoteStructure')
  event.source.replaceWith(createReplacement(event, shape, false))
  return serializeEditedScore(score)
}
