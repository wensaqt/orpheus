import { ScoreError } from './errors'
import { child, children } from './musicXml'

export function assertSinglePart(document: Document): void {
  if (children(document.documentElement, 'part').length !== 1) throw new ScoreError('multipleParts')
}

export function assertPitchCorrectionSupported(document: Document): void {
  assertSinglePart(document)
  if (document.querySelector('backup')) throw new ScoreError('backup')
  if (document.querySelector('forward')) throw new ScoreError('forward')
  if (document.querySelector('time-modification')) throw new ScoreError('rhythmicModification')
  if (document.querySelector('unpitched')) throw new ScoreError('unpitched')
}

export function assertTransposable(document: Document): void {
  assertSinglePart(document)
  if (document.querySelector('unpitched')) throw new ScoreError('unpitched')
  if (Array.from(document.querySelectorAll('key')).some((key) => !child(key, 'fifths')))
    throw new ScoreError('nonstandardKey')
  if (!document.querySelector('part > measure')?.querySelector('attributes > key > fifths'))
    throw new ScoreError('initialKeyRequired')
  if (Array.from(document.querySelectorAll('harmony')).some((harmony) => !child(harmony, 'root')))
    throw new ScoreError('chordRootRequired')
}
