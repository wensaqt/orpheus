import { ScoreError } from './errors'
import { INSTRUMENTS, type Instrument, type Interval } from './model'
import { findXmlChild, setXmlValue, readXmlValue } from './musicXml'
import { readScoreMetadata } from './validation'

const TRANSPOSE_SELECTOR = 'part > measure > attributes > transpose'

export function hasInstrumentTranspose(xml: string): boolean {
  return readScoreMetadata(xml).hasInstrumentTranspose
}

function selectedInstrumentOffset(selected: Instrument | null): Interval {
  if (!selected || !Object.hasOwn(INSTRUMENTS, selected)) throw new ScoreError('sourceRequired')
  return INSTRUMENTS[selected].writtenToSounding
}

function readWrittenToSounding(transpose: Element): Interval {
  const diatonic = Number(readXmlValue(transpose, 'diatonic'))
  const chromatic = Number(readXmlValue(transpose, 'chromatic'))
  const octave = Number(readXmlValue(transpose, 'octave-change') ?? 0)
  assertSupportedOffset(transpose, [diatonic, chromatic, octave])
  return { diatonic: diatonic + octave * 7, semitones: chromatic + octave * 12 }
}

function assertSupportedOffset(transpose: Element, numbers: number[]): void {
  if (
    transpose.hasAttribute('number') ||
    findXmlChild(transpose, 'double') ||
    (readXmlValue(transpose, 'diatonic') === null &&
      readXmlValue(transpose, 'chromatic') !== '0') ||
    readXmlValue(transpose, 'chromatic') === null ||
    numbers.some((number) => !Number.isInteger(number))
  )
    throw new ScoreError('unsupportedTranspose')
}

function assertInitialOffset(document: Document): void {
  if (!document.querySelector('part > measure')?.querySelector('attributes > transpose'))
    throw new ScoreError('lateTranspose')
}

function constantInstrumentOffset(transposes: Element[]): Interval {
  const source = readWrittenToSounding(transposes[0])
  const changesOffset = transposes.slice(1).some((transpose) => {
    const next = readWrittenToSounding(transpose)
    return next.diatonic !== source.diatonic || next.semitones !== source.semitones
  })
  if (changesOffset) throw new ScoreError('changingTranspose')
  return source
}

function isOctaveStringInstrument(instrument: Instrument | null): boolean {
  return instrument === 'guitar' || instrument === 'bass'
}

function undeclaredInstrumentOffset(document: Document, selected: Instrument | null): Interval {
  const offset = selectedInstrumentOffset(selected)
  const clefs = Array.from(document.querySelectorAll('attributes > clef'))
  if (
    !isOctaveStringInstrument(selected) ||
    !clefs.some((clef) => findXmlChild(clef, 'clef-octave-change'))
  )
    return offset
  // Octave-clef exports can encode sounding pitches without <transpose>.
  if (clefs.some((clef) => readXmlValue(clef, 'clef-octave-change') !== '-1'))
    throw new ScoreError('unsupportedTranspose')
  return { diatonic: 0, semitones: 0 }
}

function sourceInstrumentOffset(document: Document, selected: Instrument | null): Interval {
  const transposes = Array.from(document.querySelectorAll(TRANSPOSE_SELECTOR))
  if (!transposes.length) return undeclaredInstrumentOffset(document, selected)
  if (document.querySelector('clef > clef-octave-change'))
    throw new ScoreError('unsupportedTranspose')
  assertInitialOffset(document)
  return constantInstrumentOffset(transposes)
}

function hasDistinctValues(document: Document, selector: string): boolean {
  return (
    new Set(Array.from(document.querySelectorAll(selector), (node) => node.textContent)).size > 1
  )
}

function hasMultipleStaves(document: Document): boolean {
  return (
    Array.from(document.querySelectorAll('staves')).some((node) => Number(node.textContent) > 1) ||
    hasDistinctValues(document, 'note > staff')
  )
}

function hasTablature(document: Document): boolean {
  return (
    Array.from(document.querySelectorAll('clef > sign')).some(
      (sign) => sign.textContent === 'TAB',
    ) || document.querySelector('staff-tuning, technical > fret, technical > string') !== null
  )
}

function assertInstrumentCompatible(document: Document, target: Instrument): void {
  if (hasTablature(document)) throw new ScoreError('unsupportedTranspose')
  if (target === 'concert') return
  const unsupportedVoices =
    !isOctaveStringInstrument(target) && hasDistinctValues(document, 'note > voice')
  if (hasMultipleStaves(document) || unsupportedVoices) throw new ScoreError('unsupportedVoices')
}

export function instrumentConversionInterval(
  document: Document,
  target: Instrument,
  selected: Instrument | null,
): Interval {
  assertInstrumentCompatible(document, target)
  const source = sourceInstrumentOffset(document, selected)
  const destination = INSTRUMENTS[target].writtenToSounding
  return {
    diatonic: source.diatonic - destination.diatonic,
    semitones: source.semitones - destination.semitones,
  }
}

function firstMeasureAttributes(document: Document): Element {
  const measure = document.querySelector('part > measure')
  if (!measure) throw new ScoreError('noMeasures')
  const attributes =
    findXmlChild(measure, 'attributes') ??
    document.createElementNS(document.documentElement.namespaceURI, 'attributes')
  if (!attributes.parentNode) measure.prepend(attributes)
  return attributes
}

function createTransposeElement(document: Document, target: Instrument): Element {
  const transpose = document.createElementNS(document.documentElement.namespaceURI, 'transpose')
  const offset = INSTRUMENTS[target].writtenToSounding
  const octave = Math.trunc(offset.semitones / 12)
  setXmlValue(transpose, 'diatonic', String(offset.diatonic - octave * 7))
  setXmlValue(transpose, 'chromatic', String(offset.semitones - octave * 12))
  if (octave !== 0) setXmlValue(transpose, 'octave-change', String(octave))
  return transpose
}

function replaceTransposeMetadata(document: Document, target: Instrument): void {
  document.querySelectorAll(TRANSPOSE_SELECTOR).forEach((node) => node.remove())
  const attributes = firstMeasureAttributes(document)
  if (target !== 'concert') attributes.appendChild(createTransposeElement(document, target))
}

function renameInstrument(document: Document, target: Instrument): void {
  for (const selector of [
    'score-part > part-name',
    'score-part > score-instrument > instrument-name',
  ]) {
    const name = document.querySelector(selector)
    if (name) name.textContent = INSTRUMENTS[target].label
  }
}

function removePreviousInstrumentHints(document: Document): void {
  for (const selector of [
    'score-part > part-abbreviation',
    'score-part > score-instrument > instrument-abbreviation',
    'score-part > midi-instrument',
  ])
    document.querySelector(selector)?.remove()
}

function replaceInstrumentClef(document: Document, target: Instrument): void {
  if (target === 'concert') {
    document.querySelectorAll('clef > clef-octave-change').forEach((node) => node.remove())
    return
  }
  // Store written pitches plus <transpose>; do not also apply an octave clef.
  document.querySelectorAll('attributes > clef').forEach((clef) => clef.remove())
  const clef = document.createElementNS(document.documentElement.namespaceURI, 'clef')
  setXmlValue(clef, 'sign', target === 'bass' ? 'F' : 'G')
  setXmlValue(clef, 'line', target === 'bass' ? '4' : '2')
  const attributes = firstMeasureAttributes(document)
  attributes.insertBefore(
    clef,
    findXmlChild(attributes, 'staff-details') ?? findXmlChild(attributes, 'transpose'),
  )
}

export function updateInstrumentMetadata(document: Document, target: Instrument): void {
  replaceTransposeMetadata(document, target)
  renameInstrument(document, target)
  removePreviousInstrumentHints(document)
  replaceInstrumentClef(document, target)
}
