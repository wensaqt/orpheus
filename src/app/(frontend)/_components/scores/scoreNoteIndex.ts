import { NATURAL, STEPS, type Pitch } from '@/lib/scores/model'
import { child, children, parse, value } from '@/lib/scores/musicXml'
import { readPitch } from '@/lib/scores/pitch'

type Display = InstanceType<typeof import('opensheetmusicdisplay').OpenSheetMusicDisplay>
type SourceMeasure = Display['Sheet']['SourceMeasures'][number]
type RenderedNote = ReturnType<typeof renderedNotes>[number]
type XmlNote = { index: number; onset: number; duration: number; pitch: Pitch }

function supportsNotePicking(document: Document): boolean {
  return (
    children(document.documentElement, 'part').length === 1 &&
    !document.querySelector('backup, forward, chord, grace, time-modification, unpitched') &&
    Array.from(document.querySelectorAll('voice, staff, staves')).every(
      (node) => node.textContent?.trim() === '1',
    )
  )
}

function hasStableDivisions(measure: Element): boolean {
  const nodes = Array.from(measure.children)
  const firstNote = nodes.findIndex((node) => node.localName === 'note')
  return (
    measure.querySelectorAll('attributes > divisions').length <= 1 &&
    !nodes.some(
      (node, index) => node.localName === 'attributes' && firstNote >= 0 && index > firstNote,
    )
  )
}

function divisionsFor(measure: Element, inherited: number): number | null {
  if (!hasStableDivisions(measure)) return null
  const declared = value(child(measure, 'attributes') ?? measure, 'divisions')
  const divisions = declared === null ? inherited : Number(declared)
  return Number.isSafeInteger(divisions) && divisions > 0 ? divisions : null
}

function xmlNotes(measure: Element, firstIndex: number): XmlNote[] | null {
  let onset = 0
  const notes: XmlNote[] = []
  for (const note of children(measure, 'note')) {
    const duration = Number(value(note, 'duration'))
    if (!Number.isSafeInteger(duration) || duration <= 0) return null
    const pitch = child(note, 'pitch')
    if (pitch)
      notes.push({ index: firstIndex + notes.length, onset, duration, pitch: readPitch(pitch) })
    onset += duration
  }
  return notes
}

function renderedNotes(measure: SourceMeasure) {
  return measure.VerticalSourceStaffEntryContainers.flatMap((entry) => entry.StaffEntries)
    .flatMap((entry) => entry.VoiceEntries)
    .flatMap((entry) => entry.Notes)
    .filter((note) => !note.isRest())
}

function samePitch(expected: Pitch, note: RenderedNote, octaveDifference: number): boolean {
  return (
    NATURAL[STEPS.indexOf(expected.step)] === note.Pitch.FundamentalNote &&
    expected.octave === note.Pitch.Octave + octaveDifference &&
    expected.alter === note.Pitch.AccidentalHalfTones
  )
}

function sameTiming(expected: XmlNote, note: RenderedNote, divisions: number): boolean {
  const timestamp = note.ParentVoiceEntry.Timestamp
  const denominator = divisions * 4
  return (
    expected.onset * timestamp.Denominator === timestamp.Numerator * denominator &&
    expected.duration * note.Length.Denominator === note.Length.Numerator * denominator
  )
}

function uniqueXmlMatch(
  candidates: XmlNote[],
  note: RenderedNote,
  divisions: number,
  octaveDifference: number,
): XmlNote | null {
  const matches = candidates.filter(
    (candidate) =>
      sameTiming(candidate, note, divisions) && samePitch(candidate.pitch, note, octaveDifference),
  )
  return matches.length === 1 ? matches[0] : null
}

function indexMeasureNotes(
  indexes: WeakMap<object, number>,
  candidates: XmlNote[],
  notes: RenderedNote[],
  divisions: number,
  octaveDifference: number,
): boolean {
  if (notes.length !== candidates.length) return false
  const used = new Set<number>()
  for (const note of notes) {
    const match = uniqueXmlMatch(candidates, note, divisions, octaveDifference)
    if (!match || used.has(match.index)) return false
    used.add(match.index)
    indexes.set(note, match.index)
  }
  return true
}

// Match sequential single-staff notes by measure, time, duration and spelled pitch.
// Any unsupported structure, mismatch or ambiguity disables picking.
export function indexRenderedNotes(display: Display, xml: string, octaveDifference: number) {
  const document = parse(xml)
  if (!supportsNotePicking(document)) return null
  const measures = Array.from(document.querySelectorAll('part > measure'))
  if (measures.length !== display.Sheet.SourceMeasures.length) return null
  const indexes = new WeakMap<object, number>()
  let firstIndex = 0
  let divisions = 0
  for (const [ordinal, measure] of measures.entries()) {
    const currentDivisions = divisionsFor(measure, divisions)
    if (currentDivisions === null) return null
    const candidates = xmlNotes(measure, firstIndex)
    if (candidates === null) return null
    const notes = renderedNotes(display.Sheet.SourceMeasures[ordinal])
    if (!indexMeasureNotes(indexes, candidates, notes, currentDivisions, octaveDifference))
      return null
    divisions = currentDivisions
    firstIndex += candidates.length
  }
  return indexes
}
