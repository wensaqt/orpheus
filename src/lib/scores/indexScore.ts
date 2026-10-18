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

function indexMeasure(partId: string, measure: Element, index: number, initialDivisions: number) {
  let divisions = initialDivisions
  let cursor: Fraction = ZERO
  let anchor: IndexedEvent | null = null
  const events: IndexedEvent[] = []
  for (const child of Array.from(measure.children)) {
    if (child.localName === 'attributes') {
      const value = readXmlValue(child, 'divisions')
      if (value !== null) divisions = positiveInteger(value, 'divisions')
    } else if (child.localName === 'backup' || child.localName === 'forward') {
      const duration = fractionFromDivisions(
        positiveInteger(readXmlValue(child, 'duration'), 'duration'),
        divisions,
      )
      cursor =
        child.localName === 'backup'
          ? subtractFractions(cursor, duration)
          : addFractions(cursor, duration)
      if (compareFractions(cursor, ZERO) < 0)
        throw new Error('MusicXML backup precedes measure start')
      anchor = null
    } else if (child.localName === 'note') {
      const chord = findXmlChild(child, 'chord') !== null
      const voiceId = readXmlValue(child, 'voice') ?? '1'
      const durationValue = readXmlValue(child, 'duration')
      const duration =
        findXmlChild(child, 'grace') && durationValue === null
          ? ZERO
          : fractionFromDivisions(positiveInteger(durationValue, 'duration'), divisions)
      const id = `${partId}:${index}:${events.length}`
      if (chord) {
        if (!anchor || anchor.position.voiceId !== voiceId)
          throw new Error('Chord member has no matching voice anchor')
        const member = appendTone(anchor, child, `${anchor.id}:${anchor.tones.length}`, duration)
        events[events.length - 1] = member
        anchor = member
        continue
      }
      const rest = findXmlChild(child, 'rest')
      const pitch = findXmlChild(child, 'pitch')
      const unpitched = findXmlChild(child, 'unpitched')
      if (!rest && !pitch && !unpitched)
        throw new Error('Unsupported MusicXML note without pitch, rest or unpitched')
      const event: IndexedEvent = {
        id,
        position: { partId, measureIndex: index, voiceId, onset: cursor },
        duration,
        kind: rest ? 'rest' : unpitched ? 'unpitched' : 'notes',
        tones: pitch
          ? [
              {
                id: `${id}:0`,
                pitch: readPitch(pitch),
                duration,
                staff: staffNumber(child),
                source: child,
              },
            ]
          : [],
        wholeMeasure: rest?.getAttribute('measure') === 'yes',
        source: child,
      }
      events.push(event)
      anchor = event
      cursor = addFractions(cursor, duration)
    }
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
