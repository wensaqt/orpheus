import { ScoreError } from './errors'
import { XMLParser, XMLValidator } from 'fast-xml-parser'

export const MAX_SCORE_BYTES = 2_000_000

type XmlRecord = Record<string, unknown>

function record(value: unknown): XmlRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as XmlRecord)
    : {}
}

function list(value: unknown): unknown[] {
  return value === undefined ? [] : Array.isArray(value) ? value : [value]
}

function checkedXml(xml: unknown): string {
  if (typeof xml !== 'string') throw new ScoreError('invalidXml')
  if (new TextEncoder().encode(xml).length > MAX_SCORE_BYTES)
    throw new ScoreError('fileTooLarge', { size: MAX_SCORE_BYTES / 1_000_000 })
  if (XMLValidator.validate(xml) !== true) throw new ScoreError('invalidXml')
  return xml
}

function readScoreRoot(xml: string): XmlRecord {
  const roots = record(
    new XMLParser({ ignoreAttributes: false, removeNSPrefix: true, processEntities: false }).parse(
      xml,
    ),
  )
  if (
    !Object.hasOwn(roots, 'score-partwise') ||
    Object.keys(roots).filter((key) => !key.startsWith('?')).length !== 1
  )
    throw new ScoreError('invalidRoot')
  return record(roots['score-partwise'])
}

function partIds(parts: unknown[]): unknown[] {
  return parts.map((part) => record(part)['@_id'])
}

function hasValidPartDeclarations(parts: unknown[], declared: unknown[]): boolean {
  const ids = partIds(parts)
  return (
    parts.length > 0 &&
    declared.length > 0 &&
    declared.every((id) => typeof id === 'string' && Boolean(id)) &&
    new Set(declared).size === declared.length &&
    new Set(ids).size === ids.length &&
    ids.every((id) => typeof id === 'string' && declared.includes(id))
  )
}

function measuresOf(part: unknown): unknown[] {
  return list(record(part).measure)
}

function checkedParts(score: XmlRecord): unknown[] {
  const parts = list(score.part)
  const declared = partIds(list(record(score['part-list'])['score-part']))
  if (!hasValidPartDeclarations(parts, declared)) throw new ScoreError('invalidParts')
  if (parts.some((part) => !measuresOf(part).length)) throw new ScoreError('noMeasures')
  return parts
}

function initialFifths(parts: unknown[]): number | null {
  const measure = record(measuresOf(parts[0])[0])
  const attributes = record(list(measure.attributes)[0])
  const key = record(list(attributes.key)[0])
  const fifths = key.fifths === undefined ? null : Number(key.fifths)
  return fifths !== null && Number.isInteger(fifths) ? fifths : null
}

function hasInstrumentOffset(parts: unknown[]): boolean {
  return parts.some((part) =>
    measuresOf(part).some((measure) =>
      list(record(measure).attributes).some((attributes) =>
        Object.hasOwn(record(attributes), 'transpose'),
      ),
    ),
  )
}

// Shared by server writes and browser imports. Checks structure, not the full MusicXML XSD.
export function readScoreMetadata(xml: unknown): {
  fifths: number | null
  hasInstrumentTranspose: boolean
} {
  const parts = checkedParts(readScoreRoot(checkedXml(xml)))
  return { fifths: initialFifths(parts), hasInstrumentTranspose: hasInstrumentOffset(parts) }
}

export function validateScoreImport(xml: unknown): void {
  readScoreMetadata(xml)
}
