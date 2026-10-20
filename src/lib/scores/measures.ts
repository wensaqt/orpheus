import { ScoreError } from './errors'
import {
  findXmlChild,
  findXmlChildren,
  parseMusicXml,
  serializeMusicXml,
  readXmlValue,
  setXmlValue,
} from './musicXml'
import { validateScoreImport } from './validation'

const MAX_EDITABLE_STAVES = 16
export type MeasureAction =
  { type: 'append' } | { type: 'insertAfter' | 'duplicate' | 'delete'; index: number }
const ATTRIBUTE_ORDER = [
  'footnote',
  'level',
  'divisions',
  'key',
  'time',
  'staves',
  'part-symbol',
  'instruments',
  'clef',
  'staff-details',
  'transpose',
  'directive',
  'measure-style',
]

function alignedParts(document: Document): Element[][] {
  const parts = findXmlChildren(document.documentElement, 'part').map((part) =>
    findXmlChildren(part, 'measure'),
  )
  const count = parts[0].length
  if (document.querySelector('measure-style')) throw new ScoreError('unsupportedMeasureStructure')
  if (
    parts.some(
      (measures) =>
        measures.length !== count ||
        measures.some(
          (measure, index) =>
            measure.getAttribute('number') !== parts[0][index].getAttribute('number'),
        ),
    )
  )
    throw new ScoreError('unsupportedMeasureStructure')
  return parts
}

function positiveInteger(value: string | null): number {
  const number = Number(value)
  if (!Number.isSafeInteger(number) || number <= 0)
    throw new ScoreError('unsupportedMeasureStructure')
  return number
}

function latestAttribute(measures: Element[], name: string): Element | null {
  let latest: Element | null = null
  for (const measure of measures)
    for (const attributes of findXmlChildren(measure, 'attributes'))
      latest = findXmlChild(attributes, name) ?? latest
  return latest
}

function measureDuration(measures: Element[]): number {
  const divisions = positiveInteger(latestAttribute(measures, 'divisions')?.textContent ?? null)
  const time = latestAttribute(measures, 'time')
  if (!time || time.hasAttribute('number')) throw new ScoreError('unsupportedMeasureStructure')
  const beats = findXmlChildren(time, 'beats')
  const beatTypes = findXmlChildren(time, 'beat-type')
  if (!beats.length || beats.length !== beatTypes.length)
    throw new ScoreError('unsupportedMeasureStructure')
  const duration = beats.reduce((total, beat, index) => {
    const count = (beat.textContent ?? '')
      .split('+')
      .reduce((sum, value) => sum + positiveInteger(value), 0)
    return total + (count * 4 * divisions) / positiveInteger(beatTypes[index].textContent)
  }, 0)
  return positiveInteger(String(duration))
}

function appendRest(measure: Element, duration: number, staff: number, multipleStaves: boolean) {
  const note = measure.ownerDocument.createElementNS(measure.namespaceURI, 'note')
  const rest = measure.ownerDocument.createElementNS(measure.namespaceURI, 'rest')
  rest.setAttribute('measure', 'yes')
  note.append(rest)
  setXmlValue(note, 'duration', String(duration))
  if (multipleStaves) {
    setXmlValue(note, 'voice', String(staff))
    setXmlValue(note, 'staff', String(staff))
  }
  measure.append(note)
}

function emptyMeasure(measures: Element[]): Element {
  const document = measures[0].ownerDocument
  const measure = document.createElementNS(document.documentElement.namespaceURI, 'measure')
  const duration = measureDuration(measures)
  const staves = positiveInteger(latestAttribute(measures, 'staves')?.textContent ?? '1')
  if (staves > MAX_EDITABLE_STAVES) throw new ScoreError('unsupportedMeasureStructure')
  // One full-measure rest per staff; backup keeps the staves simultaneous.
  for (let staff = 1; staff <= staves; staff++) {
    if (staff > 1) {
      const backup = document.createElementNS(document.documentElement.namespaceURI, 'backup')
      setXmlValue(backup, 'duration', String(duration))
      measure.append(backup)
    }
    appendRest(measure, duration, staff, staves > 1)
  }
  return measure
}

function serialize(document: Document): string {
  const xml = serializeMusicXml(document)
  validateScoreImport(xml)
  return xml
}

function renumber(measures: Element[]): void {
  // Keep pickup measure zero; subsequent measures are numbered in document order.
  const pickup = measures[0].getAttribute('implicit') === 'yes'
  measures.forEach((measure, index) =>
    measure.setAttribute('number', String(index + (pickup ? 0 : 1))),
  )
}

export function appendMeasure(xml: string): string {
  const document = parseMusicXml(xml)
  for (const measures of alignedParts(document)) {
    const last = measures[measures.length - 1]
    if (last.querySelector('repeat, ending')) throw new ScoreError('unsupportedMeasureStructure')
    const next = emptyMeasure(measures)
    // A final barline belongs at the end of the score, after the newly added rest.
    const final = finalBarline(last)
    if (final) next.append(final)
    last.after(next)
    renumber([...measures, next])
  }
  return serialize(document)
}

function initialAttributes(measure: Element): Element[] {
  const attributes: Element[] = []
  let hasMusic = false
  for (const child of Array.from(measure.children)) {
    if (['note', 'backup', 'forward'].includes(child.localName)) hasMusic = true
    if (child.localName !== 'attributes') continue
    if (hasMusic) throw new ScoreError('unsupportedMeasureStructure')
    attributes.push(child)
  }
  return attributes
}

function mergedAttributes(attributes: Element[]): Element[] {
  const fields = new Map<string, Element>()
  for (const group of attributes)
    for (const field of Array.from(group.children))
      fields.set(`${field.localName}:${field.getAttribute('number') ?? ''}`, field)
  return [...fields.values()].sort(
    (left, right) =>
      ATTRIBUTE_ORDER.indexOf(left.localName) - ATTRIBUTE_ORDER.indexOf(right.localName),
  )
}

function carryAttributes(removed: Element, next: Element): void {
  const existing = initialAttributes(next)
  const fields = mergedAttributes([...initialAttributes(removed), ...existing])
  if (!fields.length) return
  const attributes = next.ownerDocument.createElementNS(next.namespaceURI, 'attributes')
  attributes.append(...fields.map((field) => field.cloneNode(true)))
  existing.forEach((node) => node.remove())
  next.prepend(attributes)
}

function finalBarline(measure: Element): Element | undefined {
  return findXmlChildren(measure, 'barline').find(
    (barline) =>
      barline.getAttribute('location') !== 'left' &&
      readXmlValue(barline, 'bar-style') === 'light-heavy',
  )
}

function carryFinalBarline(removed: Element, previous: Element): void {
  const final = finalBarline(removed)
  if (!final) return
  findXmlChildren(previous, 'barline')
    .filter((barline) => barline.getAttribute('location') !== 'left')
    .forEach((barline) => barline.remove())
  previous.append(final)
}

function assertSafeDeletion(document: Document, measureIndex: number, parts: Element[][]): void {
  assertMeasureIndex(measureIndex, parts)
  if (parts[0].length === 1) throw new ScoreError('lastMeasure')
  assertNoSpanners(document)
}

function assertMeasureIndex(measureIndex: number, parts: Element[][]): void {
  if (!Number.isInteger(measureIndex) || measureIndex < 0 || measureIndex >= parts[0].length)
    throw new ScoreError('measureMissing')
}

function assertNoSpanners(document: Document): void {
  // Removing a boundary can orphan spanners or alter playback navigation. Keep these scores intact
  // until the command can repair the paired endpoints and repeat/jump semantics explicitly.
  if (
    document.querySelector(
      'tie, tied, slur, glissando, slide, wedge, dashes, bracket, octave-shift, pedal, repeat, ending, segno, coda, sound[dc], sound[ds], sound[tocoda], sound[fine]',
    )
  )
    throw new ScoreError('unsupportedMeasureStructure')
}

export function insertMeasureAfter(xml: string, index: number): string {
  const document = parseMusicXml(xml)
  const parts = alignedParts(document)
  assertMeasureIndex(index, parts)
  assertNoSpanners(document)
  for (const measures of parts) {
    const next = emptyMeasure(measures.slice(0, index + 1))
    if (index === measures.length - 1) {
      const final = finalBarline(measures[index])
      if (final) next.append(final)
    }
    measures[index].after(next)
    renumber([...measures.slice(0, index + 1), next, ...measures.slice(index + 1)])
  }
  return serialize(document)
}

function duplicateContent(measure: Element): Element {
  initialAttributes(measure)
  // IDs may be referenced elsewhere; copying them would make the document ambiguous.
  if (measure.hasAttribute('id') || measure.querySelector('[id]'))
    throw new ScoreError('unsupportedMeasureStructure')
  const clone = measure.cloneNode(true) as Element
  findXmlChildren(clone, 'print').forEach((node) => node.remove())
  return clone
}

export function duplicateMeasure(xml: string, index: number): string {
  const document = parseMusicXml(xml)
  const parts = alignedParts(document)
  assertMeasureIndex(index, parts)
  assertNoSpanners(document)
  for (const measures of parts) {
    const source = measures[index]
    const clone = duplicateContent(source)
    finalBarline(source)?.remove()
    source.after(clone)
    renumber([...measures.slice(0, index + 1), clone, ...measures.slice(index + 1)])
  }
  return serialize(document)
}

export function editScoreMeasures(xml: string, action: MeasureAction): string {
  switch (action.type) {
    case 'append':
      return appendMeasure(xml)
    case 'insertAfter':
      return insertMeasureAfter(xml, action.index)
    case 'duplicate':
      return duplicateMeasure(xml, action.index)
    case 'delete':
      return deleteMeasure(xml, action.index)
  }
}

export function deleteMeasure(xml: string, measureIndex: number): string {
  const document = parseMusicXml(xml)
  const parts = alignedParts(document)
  assertSafeDeletion(document, measureIndex, parts)
  for (const measures of parts) {
    const removed = measures[measureIndex]
    const next = measures[measureIndex + 1]
    if (next) carryAttributes(removed, next)
    else carryFinalBarline(removed, measures[measureIndex - 1])
    removed.remove()
    renumber(measures.filter((measure) => measure !== removed))
  }
  return serialize(document)
}

export function scoreMeasures(xml: string): { index: number; number: string }[] {
  const parts = alignedParts(parseMusicXml(xml))
  return parts[0].map((measure, index) => ({
    index,
    number: measure.getAttribute('number') ?? String(index + 1),
  }))
}
