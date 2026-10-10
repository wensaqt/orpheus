import { ScoreError } from './errors'
import { INSTRUMENTS, type Instrument, type Interval } from './model'
import { child, setValue, value } from './musicXml'
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
  const diatonic = Number(value(transpose, 'diatonic'))
  const chromatic = Number(value(transpose, 'chromatic'))
  const octave = Number(value(transpose, 'octave-change') ?? 0)
  assertSupportedOffset(transpose, [diatonic, chromatic, octave])
  return { diatonic: diatonic + octave * 7, semitones: chromatic + octave * 12 }
}

function assertSupportedOffset(transpose: Element, numbers: number[]): void {
  if (
    transpose.hasAttribute('number') ||
    child(transpose, 'double') ||
    value(transpose, 'diatonic') === null ||
    value(transpose, 'chromatic') === null ||
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

function sourceInstrumentOffset(document: Document, selected: Instrument | null): Interval {
  const transposes = Array.from(document.querySelectorAll(TRANSPOSE_SELECTOR))
  if (!transposes.length) return selectedInstrumentOffset(selected)
  assertInitialOffset(document)
  return constantInstrumentOffset(transposes)
}

function hasMultipleVoicesOrStaves(document: Document): boolean {
  const distinctValues = (selector: string) =>
    new Set(Array.from(document.querySelectorAll(selector), (node) => node.textContent)).size
  return (
    Array.from(document.querySelectorAll('staves')).some((node) => Number(node.textContent) > 1) ||
    distinctValues('note > staff') > 1 ||
    distinctValues('note > voice') > 1
  )
}

function assertInstrumentCompatible(document: Document, target: Instrument): void {
  if (target !== 'concert' && hasMultipleVoicesOrStaves(document))
    throw new ScoreError('unsupportedVoices')
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
  const attributes = child(measure, 'attributes') ?? document.createElement('attributes')
  if (!attributes.parentNode) measure.prepend(attributes)
  return attributes
}

function createTransposeElement(document: Document, target: Instrument): Element {
  const transpose = document.createElement('transpose')
  const offset = INSTRUMENTS[target].writtenToSounding
  const octave = Math.trunc(offset.semitones / 12)
  setValue(transpose, 'diatonic', String(offset.diatonic - octave * 7))
  setValue(transpose, 'chromatic', String(offset.semitones - octave * 12))
  if (octave !== 0) setValue(transpose, 'octave-change', String(octave))
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

export function updateInstrumentMetadata(document: Document, target: Instrument): void {
  replaceTransposeMetadata(document, target)
  renameInstrument(document, target)
  removePreviousInstrumentHints(document)
}
