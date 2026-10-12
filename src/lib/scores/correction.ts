import { ScoreError } from './errors'
import { STEPS, type Pitch } from './model'
import { assertPitchCorrectionSupported } from './capabilities'
import { findXmlChild, parseMusicXml } from './musicXml'
import { readPitch, writePitch, accidentalName } from './pitch'

export type ScoreNote = { index: number; measure: string; pitch: Pitch }

const ELEMENTS_AFTER_ACCIDENTAL = new Set([
  'time-modification',
  'stem',
  'notehead',
  'staff',
  'beam',
  'notations',
  'lyric',
])

function editableDocument(xml: string): Document {
  const document = parseMusicXml(xml)
  assertPitchCorrectionSupported(document)
  return document
}

function pitchedNotes(document: Document): Element[] {
  return Array.from(document.querySelectorAll('part > measure > note > pitch'))
}

function scoreNote(pitch: Element, index: number): ScoreNote {
  return {
    index,
    measure: pitch.parentElement?.parentElement?.getAttribute('number') ?? '?',
    pitch: readPitch(pitch),
  }
}

export function inspectScore(xml: string): ScoreNote[] {
  return pitchedNotes(editableDocument(xml)).map(scoreNote)
}

function assertValidCorrection(next: Pitch): void {
  if (
    !STEPS.includes(next.step) ||
    !Number.isInteger(next.octave) ||
    !Number.isInteger(next.alter) ||
    Math.abs(next.alter) > 2
  ) {
    throw new ScoreError('invalidPitch')
  }
}

function pitchAt(document: Document, index: number): Element {
  const pitch = pitchedNotes(document)[index]
  if (!pitch) throw new ScoreError('noteMissing')
  return pitch
}

function insertAccidental(note: Element, alter: number): void {
  const accidental = note.ownerDocument.createElement('accidental')
  accidental.textContent = accidentalName(alter)
  const following = Array.from(note.children).find((element) =>
    ELEMENTS_AFTER_ACCIDENTAL.has(element.localName),
  )
  note.insertBefore(accidental, following ?? null)
}

function updateCorrectedNote(note: Element, alter: number): void {
  note.removeAttribute('default-y')
  const accidental = findXmlChild(note, 'accidental')
  if (accidental) accidental.textContent = accidentalName(alter)
  else if (alter !== 0) insertAccidental(note, alter)
}

export function correctPitch(xml: string, noteIndex: number, next: Pitch): string {
  assertValidCorrection(next)
  const document = editableDocument(xml)
  const pitch = pitchAt(document, noteIndex)
  writePitch(pitch, next)
  const note = pitch.parentElement
  if (note) updateCorrectedNote(note, next.alter)
  return new XMLSerializer().serializeToString(document)
}
