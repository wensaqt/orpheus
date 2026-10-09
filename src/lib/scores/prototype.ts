/** A deliberately small MusicXML experiment. No document or database state lives here. */
export type Pitch = { step: Step; alter: number; octave: number }
export type Step = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B'
export type Interval = { label: string; diatonic: number; semitones: number }

export const INTERVALS: Interval[] = [
  { label: 'Aucune', diatonic: 0, semitones: 0 },
  { label: 'Seconde majeure ↑', diatonic: 1, semitones: 2 },
  { label: 'Tierce mineure ↑', diatonic: 2, semitones: 3 },
  { label: 'Tierce majeure ↑', diatonic: 2, semitones: 4 },
  { label: 'Quarte juste ↑', diatonic: 3, semitones: 5 },
  { label: 'Quinte juste ↑', diatonic: 4, semitones: 7 },
  { label: 'Octave ↑', diatonic: 7, semitones: 12 },
  { label: 'Seconde majeure ↓', diatonic: -1, semitones: -2 },
  { label: 'Tierce mineure ↓', diatonic: -2, semitones: -3 },
  { label: 'Quarte juste ↓', diatonic: -3, semitones: -5 },
  { label: 'Octave ↓', diatonic: -7, semitones: -12 },
]

export type Instrument = 'concert' | 'trumpet-bb' | 'alto-sax-eb' | 'tenor-sax-bb'

export const INSTRUMENTS: Record<
  Instrument,
  { label: string; code: string; writtenToSounding: Interval }
> = {
  concert: { label: 'Hauteur réelle', code: 'Ut', writtenToSounding: INTERVALS[0] },
  'trumpet-bb': {
    label: 'Trompette en si♭',
    code: 'Tpt Si♭',
    writtenToSounding: { label: '', diatonic: -1, semitones: -2 },
  },
  'alto-sax-eb': {
    label: 'Saxophone alto en mi♭',
    code: 'Sax alto Mi♭',
    writtenToSounding: { label: '', diatonic: -5, semitones: -9 },
  },
  'tenor-sax-bb': {
    label: 'Saxophone ténor en si♭',
    code: 'Sax tén. Si♭',
    writtenToSounding: { label: '', diatonic: -8, semitones: -14 },
  },
}

const STEPS: Step[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
const NATURAL = [0, 2, 4, 5, 7, 9, 11]
const FIFTH_TONICS: [Step, number][] = [
  ['C', -1],
  ['G', -1],
  ['D', -1],
  ['A', -1],
  ['E', -1],
  ['B', -1],
  ['F', 0],
  ['C', 0],
  ['G', 0],
  ['D', 0],
  ['A', 0],
  ['E', 0],
  ['B', 0],
  ['F', 1],
  ['C', 1],
]

function children(parent: Element, name: string): Element[] {
  return Array.from(parent.children).filter((child) => child.localName === name)
}

function child(parent: Element, name: string): Element | null {
  return children(parent, name)[0] ?? null
}

function value(parent: Element, name: string): string | null {
  return child(parent, name)?.textContent?.trim() ?? null
}

function required(parent: Element, name: string): string {
  const result = value(parent, name)
  if (!result) throw new Error(`MusicXML incomplet : ${name} manquant.`)
  return result
}

function setValue(parent: Element, name: string, text: string): void {
  let element = child(parent, name)
  if (!element) {
    element = parent.ownerDocument.createElement(name)
    parent.appendChild(element)
  }
  element.textContent = text
}

function parse(xml: string): Document {
  const document = new DOMParser().parseFromString(xml, 'application/xml')
  if (
    document.querySelector('parsererror') ||
    document.documentElement.localName !== 'score-partwise'
  ) {
    throw new Error('Le fichier doit être un MusicXML score-partwise valide.')
  }
  if (!document.querySelector('part > measure')) {
    throw new Error('Cette partition MusicXML ne contient aucune mesure.')
  }
  return document
}

// Import is deliberately broader than the prototype's editing engine. OSMD can display
// ordinary MusicXML with multiple voices and tuplets while those transformations are pending.
export function validateScoreImport(xml: string): void {
  parse(xml)
}

function assertSinglePart(document: Document, action: string): void {
  if (children(document.documentElement, 'part').length !== 1) {
    throw new Error(`${action} ne prend pas encore en charge plusieurs parties instrumentales.`)
  }
}

function assertPitchCorrectionSupported(document: Document): void {
  const action = 'La correction de hauteur'
  assertSinglePart(document, action)
  if (document.querySelector('backup'))
    throw new Error(
      `Cette partition utilise <backup> pour plusieurs voix ou portées. ${action} n’est pas encore disponible.`,
    )
  if (document.querySelector('forward'))
    throw new Error(
      `Cette partition utilise <forward> pour avancer dans une mesure. ${action} n’est pas encore disponible.`,
    )
  if (document.querySelector('time-modification'))
    throw new Error(
      `Cette partition contient des triolets ou d’autres modifications rythmiques. ${action} n’est pas encore disponible.`,
    )
  if (document.querySelector('unpitched'))
    throw new Error(
      `Cette partition contient des percussions sans hauteur déterminée. ${action} n’est pas encore disponible.`,
    )
}

function assertTransposable(document: Document): void {
  assertSinglePart(document, 'La transposition')
  if (document.querySelector('unpitched')) {
    throw new Error('Cette partition contient des percussions sans hauteur déterminée.')
  }
  if (Array.from(document.querySelectorAll('key')).some((key) => !child(key, 'fifths'))) {
    throw new Error('Une armure non standard n’est pas prise en charge.')
  }
  if (!document.querySelector('part > measure')?.querySelector('attributes > key > fifths')) {
    throw new Error('Ce prototype demande une armure explicite dans la première mesure.')
  }
  if (Array.from(document.querySelectorAll('harmony')).some((harmony) => !child(harmony, 'root'))) {
    throw new Error('Un symbole d’accord sans racine structurée n’est pas pris en charge.')
  }
}

function readPitch(pitch: Element): Pitch {
  const step = required(pitch, 'step') as Step
  const alter = Number(value(pitch, 'alter') ?? 0)
  const octave = Number(required(pitch, 'octave'))
  if (
    !STEPS.includes(step) ||
    !Number.isInteger(alter) ||
    Math.abs(alter) > 2 ||
    !Number.isInteger(octave)
  ) {
    throw new Error('Hauteur ou altération non prise en charge.')
  }
  return { step, alter, octave }
}

function writePitch(pitch: Element, next: Pitch): void {
  setValue(pitch, 'step', next.step)
  let alter = child(pitch, 'alter')
  if (next.alter === 0) alter?.remove()
  else {
    if (!alter) {
      alter = pitch.ownerDocument.createElement('alter')
      pitch.insertBefore(alter, child(pitch, 'octave'))
    }
    alter.textContent = String(next.alter)
  }
  setValue(pitch, 'octave', String(next.octave))
}

function shiftPitch(pitch: Pitch, interval: Interval): Pitch {
  const index = STEPS.indexOf(pitch.step) + pitch.octave * 7 + interval.diatonic
  const targetStep = ((index % 7) + 7) % 7
  const octave = Math.floor(index / 7)
  const oldIndex = STEPS.indexOf(pitch.step)
  const semitone = pitch.octave * 12 + NATURAL[oldIndex] + pitch.alter + interval.semitones
  const alter = semitone - (octave * 12 + NATURAL[targetStep])
  if (Math.abs(alter) > 2) throw new Error('Cette transposition demanderait une triple altération.')
  return { step: STEPS[targetStep], alter, octave }
}

function shiftFifths(fifths: number, interval: Interval): number {
  if (!Number.isInteger(fifths) || Math.abs(fifths) > 7) {
    throw new Error('Armure hors du sous-ensemble testé (maximum sept altérations).')
  }
  const [step, alter] = FIFTH_TONICS[fifths + 7]
  const target = shiftPitch({ step, alter, octave: 4 }, interval)
  const result = FIFTH_TONICS.findIndex(
    ([candidateStep, candidateAlter]) =>
      candidateStep === target.step && candidateAlter === target.alter,
  )
  if (result < 0) throw new Error('L’armure cible sort du sous-ensemble testé.')
  return result - 7
}

export function hasInstrumentTranspose(xml: string): boolean {
  return !!parse(xml).querySelector('part > measure > attributes > transpose')
}

function sourceInstrumentOffset(document: Document, selected: Instrument | null): Interval {
  const transposes = Array.from(
    document.querySelectorAll('part > measure > attributes > transpose'),
  )
  if (transposes.length === 0) {
    if (!selected || !Object.hasOwn(INSTRUMENTS, selected)) {
      throw new Error('Choisissez l’instrument source de cette partition.')
    }
    return INSTRUMENTS[selected].writtenToSounding
  }

  const firstMeasure = document.querySelector('part > measure')
  if (!firstMeasure?.querySelector('attributes > transpose')) {
    throw new Error('La transposition de l’instrument source commence après la première mesure.')
  }

  const readOffset = (transpose: Element): Interval => {
    const diatonic = Number(value(transpose, 'diatonic'))
    const chromatic = Number(value(transpose, 'chromatic'))
    const octave = Number(value(transpose, 'octave-change') ?? 0)
    if (
      transpose.hasAttribute('number') ||
      child(transpose, 'double') ||
      value(transpose, 'diatonic') === null ||
      value(transpose, 'chromatic') === null ||
      !Number.isInteger(diatonic) ||
      !Number.isInteger(chromatic) ||
      !Number.isInteger(octave)
    ) {
      throw new Error('La transposition de l’instrument source n’est pas prise en charge.')
    }
    return { label: '', diatonic: diatonic + octave * 7, semitones: chromatic + octave * 12 }
  }

  const source = readOffset(transposes[0])
  for (const transpose of transposes.slice(1)) {
    const next = readOffset(transpose)
    if (next.diatonic !== source.diatonic || next.semitones !== source.semitones) {
      throw new Error('La transposition de l’instrument source change dans la partition.')
    }
  }
  return source
}

export type ScoreNote = { index: number; measure: string; pitch: Pitch }

export function inspectScore(xml: string): ScoreNote[] {
  const document = parse(xml)
  assertPitchCorrectionSupported(document)
  const notes: ScoreNote[] = []
  for (const measure of Array.from(document.querySelectorAll('part > measure'))) {
    for (const note of children(measure, 'note')) {
      const pitch = child(note, 'pitch')
      if (pitch)
        notes.push({
          index: notes.length,
          measure: measure.getAttribute('number') ?? '?',
          pitch: readPitch(pitch),
        })
    }
  }
  return notes
}

export function correctPitch(xml: string, noteIndex: number, next: Pitch): string {
  if (
    !STEPS.includes(next.step) ||
    !Number.isInteger(next.octave) ||
    !Number.isInteger(next.alter) ||
    Math.abs(next.alter) > 2
  ) {
    throw new Error('La nouvelle hauteur est invalide.')
  }
  const document = parse(xml)
  assertPitchCorrectionSupported(document)
  const pitches = Array.from(document.querySelectorAll('part > measure > note > pitch'))
  const pitch = pitches[noteIndex]
  if (!pitch) throw new Error('Note introuvable.')
  writePitch(pitch, next)
  const note = pitch.parentElement
  if (note) {
    note.removeAttribute('default-y')
    const accidental = child(note, 'accidental')
    if (accidental) accidental.textContent = accidentalName(next.alter)
    else if (next.alter !== 0) {
      const nextAccidental = document.createElement('accidental')
      nextAccidental.textContent = accidentalName(next.alter)
      const following = Array.from(note.children).find((element) =>
        ['time-modification', 'stem', 'notehead', 'staff', 'beam', 'notations', 'lyric'].includes(
          element.localName,
        ),
      )
      note.insertBefore(nextAccidental, following ?? null)
    }
  }
  return new XMLSerializer().serializeToString(document)
}

function accidentalName(alter: number): string {
  return (
    { '-2': 'flat-flat', '-1': 'flat', 0: 'natural', 1: 'sharp', 2: 'double-sharp' } as Record<
      number,
      string
    >
  )[alter]
}

function transposeDocument(
  xml: string,
  interval: Interval,
  target: Instrument | null,
  sourceInstrument: Instrument | null = null,
): string {
  const document = parse(xml)
  assertTransposable(document)
  if (target) {
    if (
      target !== 'concert' &&
      (Array.from(document.querySelectorAll('staves')).some(
        (node) => Number(node.textContent) > 1,
      ) ||
        new Set(Array.from(document.querySelectorAll('note > staff'), (node) => node.textContent))
          .size > 1 ||
        new Set(Array.from(document.querySelectorAll('note > voice'), (node) => node.textContent))
          .size > 1)
    ) {
      throw new Error(
        'La conversion de plusieurs voix ou portées vers cet instrument n’est pas encore disponible.',
      )
    }
    const source = sourceInstrumentOffset(document, sourceInstrument)
    const destination = INSTRUMENTS[target].writtenToSounding
    interval = {
      label: '',
      diatonic: source.diatonic - destination.diatonic,
      semitones: source.semitones - destination.semitones,
    }
  }
  for (const key of Array.from(document.querySelectorAll('part > measure > attributes > key'))) {
    const fifths = child(key, 'fifths')
    if (!fifths) throw new Error('Armure non standard.')
    fifths.textContent = String(shiftFifths(Number(fifths.textContent), interval))
  }
  for (const note of Array.from(document.querySelectorAll('part > measure > note'))) {
    const pitch = child(note, 'pitch')
    if (!pitch) continue
    const shifted = shiftPitch(readPitch(pitch), interval)
    writePitch(pitch, shifted)
    note.removeAttribute('default-y')
    const accidental = child(note, 'accidental')
    if (accidental) accidental.textContent = accidentalName(shifted.alter)
  }
  for (const harmony of Array.from(document.querySelectorAll('part > measure > harmony'))) {
    for (const [parentName, stepName, alterName] of [
      ['root', 'root-step', 'root-alter'],
      ['bass', 'bass-step', 'bass-alter'],
    ]) {
      const parent = child(harmony, parentName)
      if (!parent) continue
      const step = required(parent, stepName) as Step
      if (!STEPS.includes(step)) throw new Error('Symbole d’accord non pris en charge.')
      const shifted = shiftPitch(
        { step, alter: Number(value(parent, alterName) ?? 0), octave: 4 },
        interval,
      )
      setValue(parent, stepName, shifted.step)
      if (shifted.alter === 0) child(parent, alterName)?.remove()
      else setValue(parent, alterName, String(shifted.alter))
    }
  }
  if (target) {
    document
      .querySelectorAll('part > measure > attributes > transpose')
      .forEach((node) => node.remove())
    const firstMeasure = document.querySelector('part > measure')
    if (!firstMeasure) throw new Error('Aucune mesure trouvée.')
    let attributes = child(firstMeasure, 'attributes')
    if (!attributes) {
      attributes = document.createElement('attributes')
      firstMeasure.prepend(attributes)
    }
    if (target !== 'concert') {
      const transpose = document.createElement('transpose')
      const writtenToSounding = INSTRUMENTS[target].writtenToSounding
      const octave = Math.trunc(writtenToSounding.semitones / 12)
      setValue(transpose, 'diatonic', String(writtenToSounding.diatonic - octave * 7))
      setValue(transpose, 'chromatic', String(writtenToSounding.semitones - octave * 12))
      if (octave !== 0) setValue(transpose, 'octave-change', String(octave))
      attributes.appendChild(transpose)
    }
    const partName = document.querySelector('score-part > part-name')
    if (partName) partName.textContent = INSTRUMENTS[target].label
    const scoreInstrumentName = document.querySelector(
      'score-part > score-instrument > instrument-name',
    )
    if (scoreInstrumentName) scoreInstrumentName.textContent = INSTRUMENTS[target].label
    document.querySelector('score-part > part-abbreviation')?.remove()
    document.querySelector('score-part > score-instrument > instrument-abbreviation')?.remove()
    document.querySelector('score-part > midi-instrument')?.remove()
  }
  return new XMLSerializer().serializeToString(document)
}

export function transposeKey(xml: string, interval: Interval): string {
  return transposeDocument(xml, interval, null)
}

export function adaptToInstrument(
  xml: string,
  target: Instrument,
  sourceInstrument: Instrument | null = null,
): string {
  return transposeDocument(xml, INTERVALS[0], target, sourceInstrument)
}
