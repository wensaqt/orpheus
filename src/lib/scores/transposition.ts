import { ScoreError } from './errors'
import { FIFTH_TONICS, type Instrument, type Interval, type Pitch, type Step, STEPS } from './model'
import { assertTransposable } from './capabilities'
import { findXmlChild, parseMusicXml, requireXmlValue, setXmlValue, readXmlValue } from './musicXml'
import { accidentalName, readPitch, shiftPitch, writePitch } from './pitch'
import { instrumentConversionInterval, updateInstrumentMetadata } from './instrumentTransposition'

export { hasInstrumentTranspose } from './instrumentTransposition'

function tonicOfKey(fifths: number): Pitch {
  if (!Number.isInteger(fifths) || Math.abs(fifths) > 7) throw new ScoreError('keyOutOfRange')
  const [step, alter] = FIFTH_TONICS[fifths + 7]
  return { step, alter, octave: 4 }
}

function fifthsOfTonic(pitch: Pitch): number {
  const index = FIFTH_TONICS.findIndex(
    ([step, alter]) => step === pitch.step && alter === pitch.alter,
  )
  if (index < 0) throw new ScoreError('keyOutOfRange')
  return index - 7
}

function transposeKeySignature(key: Element, interval: Interval): void {
  const fifths = findXmlChild(key, 'fifths')
  if (!fifths) throw new ScoreError('nonstandardKey')
  const tonic = tonicOfKey(Number(fifths.textContent))
  fifths.textContent = String(fifthsOfTonic(shiftPitch(tonic, interval)))
}

function transposeNote(note: Element, interval: Interval): void {
  const pitch = findXmlChild(note, 'pitch')
  if (!pitch) return
  const shifted = shiftPitch(readPitch(pitch), interval)
  writePitch(pitch, shifted)
  note.removeAttribute('default-y')
  const accidental = findXmlChild(note, 'accidental')
  if (accidental) accidental.textContent = accidentalName(shifted.alter)
}

function transposeChordPitch(parent: Element, kind: 'root' | 'bass', interval: Interval) {
  const stepName = `${kind}-step`
  const alterName = `${kind}-alter`
  const step = requireXmlValue(parent, stepName) as Step
  if (!STEPS.includes(step)) throw new ScoreError('unsupportedChord')
  const shifted = shiftPitch(
    { step, alter: Number(readXmlValue(parent, alterName) ?? 0), octave: 4 },
    interval,
  )
  setXmlValue(parent, stepName, shifted.step)
  if (shifted.alter === 0) findXmlChild(parent, alterName)?.remove()
  else setXmlValue(parent, alterName, String(shifted.alter))
}

function transposeHarmony(harmony: Element, interval: Interval): void {
  const root = findXmlChild(harmony, 'root')
  const bass = findXmlChild(harmony, 'bass')
  if (root) transposeChordPitch(root, 'root', interval)
  if (bass) transposeChordPitch(bass, 'bass', interval)
}

function transposeContent(document: Document, interval: Interval): void {
  document
    .querySelectorAll('part > measure > attributes > key')
    .forEach((key) => transposeKeySignature(key, interval))
  document
    .querySelectorAll('part > measure > note')
    .forEach((note) => transposeNote(note, interval))
  document
    .querySelectorAll('part > measure > harmony')
    .forEach((harmony) => transposeHarmony(harmony, interval))
}

function transposableDocument(xml: string): Document {
  const document = parseMusicXml(xml)
  assertTransposable(document)
  return document
}

export function transposeKey(xml: string, interval: Interval): string {
  const document = transposableDocument(xml)
  transposeContent(document, interval)
  return new XMLSerializer().serializeToString(document)
}

export function adaptToInstrument(
  xml: string,
  target: Instrument,
  source: Instrument | null = null,
): string {
  const document = transposableDocument(xml)
  transposeContent(document, instrumentConversionInterval(document, target, source))
  updateInstrumentMetadata(document, target)
  return new XMLSerializer().serializeToString(document)
}
