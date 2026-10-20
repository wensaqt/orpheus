import { findXmlChild, findXmlChildren, parseMusicXml, readXmlValue } from './musicXml'
import { readPitch } from './pitch'
import type { Pitch } from './model'
import {
  addFractions,
  compareFractions,
  fractionFromDivisions,
  subtractFractions,
  ZERO,
  type Fraction,
} from './fractions'

export type MusicalPosition = Readonly<{
  partId: string
  measureIndex: number
  voiceId: string
  onset: Fraction
}>

export type IndexedTone = Readonly<{
  id: string
  pitch: Pitch
  duration: Fraction
  staff: number
  source: Element
}>

export type IndexedEvent = Readonly<{
  id: string
  position: MusicalPosition
  duration: Fraction
  kind: 'notes' | 'rest' | 'unpitched'
  tones: readonly IndexedTone[]
  wholeMeasure: boolean
  source: Element
}>

export type IndexedMeasure = Readonly<{
  partId: string
  index: number
  printedNumber: string | null
  events: readonly IndexedEvent[]
  source: Element
}>

export type ScoreIndex = Readonly<{ measures: readonly IndexedMeasure[]; document: Document }>

function positiveInteger(value: string | null, field: string): number {
  const parsed = Number(value)
  if (!value || !Number.isSafeInteger(parsed) || parsed <= 0)
    throw new Error(`Invalid MusicXML ${field}`)
  return parsed
}

function staffNumber(note: Element): number {
  const value = readXmlValue(note, 'staff')
  return value === null ? 1 : positiveInteger(value, 'staff')
}

function appendTone(
  event: IndexedEvent,
  note: Element,
  toneId: string,
  duration: Fraction,
): IndexedEvent {
  const pitch = findXmlChild(note, 'pitch')
  if (!pitch || event.kind !== 'notes') throw new Error('Chord member requires a pitched anchor')
  return {
    ...event,
    tones: [
      ...event.tones,
      { id: toneId, pitch: readPitch(pitch), duration, staff: staffNumber(note), source: note },
    ],
  }
}

function readDuration(element: Element, divisions: number): Fraction {
  return fractionFromDivisions(
    positiveInteger(readXmlValue(element, 'duration'), 'duration'),
    divisions,
  )
}

function readNoteDuration(note: Element, divisions: number): Fraction {
  if (findXmlChild(note, 'grace') && readXmlValue(note, 'duration') === null) return ZERO
  return readDuration(note, divisions)
}

function moveCursor(cursor: Fraction, movement: Element, divisions: number): Fraction {
  const duration = readDuration(movement, divisions)
  const next =
    movement.localName === 'backup'
      ? subtractFractions(cursor, duration)
      : addFractions(cursor, duration)
  if (compareFractions(next, ZERO) < 0) throw new Error('MusicXML backup precedes measure start')
  return next
}

function createIndexedEvent(
  note: Element,
  id: string,
  position: MusicalPosition,
  duration: Fraction,
): IndexedEvent {
  const rest = findXmlChild(note, 'rest')
  const pitch = findXmlChild(note, 'pitch')
  const unpitched = findXmlChild(note, 'unpitched')
  if (!rest && !pitch && !unpitched)
    throw new Error('Unsupported MusicXML note without pitch, rest or unpitched')
  return {
    id,
    position,
    duration,
    kind: rest ? 'rest' : unpitched ? 'unpitched' : 'notes',
    tones: pitch
      ? [
          {
            id: `${id}:0`,
            pitch: readPitch(pitch),
            duration,
            staff: staffNumber(note),
            source: note,
          },
        ]
      : [],
    wholeMeasure: rest?.getAttribute('measure') === 'yes',
    source: note,
  }
}

function indexMeasure(partId: string, measure: Element, index: number, initialDivisions: number) {
  let divisions = initialDivisions
  let cursor: Fraction = ZERO
  let anchor: IndexedEvent | null = null
  const events: IndexedEvent[] = []
  for (const child of Array.from(measure.children)) {
    if (child.localName === 'attributes') {
      const value = readXmlValue(child, 'divisions')
      if (value !== null) divisions = positiveInteger(value, 'divisions')
      continue
    }
    if (child.localName === 'backup' || child.localName === 'forward') {
      cursor = moveCursor(cursor, child, divisions)
      anchor = null
      continue
    }
    if (child.localName !== 'note') continue
    const voiceId = readXmlValue(child, 'voice') ?? '1'
    const duration = readNoteDuration(child, divisions)
    if (findXmlChild(child, 'chord')) {
      if (!anchor || anchor.position.voiceId !== voiceId)
        throw new Error('Chord member has no matching voice anchor')
      anchor = appendTone(anchor, child, `${anchor.id}:${anchor.tones.length}`, duration)
      events[events.length - 1] = anchor
      continue
    }
    const event = createIndexedEvent(
      child,
      `${partId}:${index}:${events.length}`,
      { partId, measureIndex: index, voiceId, onset: cursor },
      duration,
    )
    events.push(event)
    anchor = event
    cursor = addFractions(cursor, duration)
  }
  return {
    measure: {
      partId,
      index,
      printedNumber: measure.getAttribute('number'),
      events,
      source: measure,
    },
    divisions,
  }
}

export function indexScore(xml: string): ScoreIndex {
  const document = parseMusicXml(xml)
  const measures: IndexedMeasure[] = []
  for (const part of findXmlChildren(document.documentElement, 'part')) {
    const partId = part.getAttribute('id') ?? ''
    let divisions = 1
    findXmlChildren(part, 'measure').forEach((measure, index) => {
      const result = indexMeasure(partId, measure, index, divisions)
      measures.push(result.measure)
      divisions = result.divisions
    })
  }
  return { document, measures }
}
