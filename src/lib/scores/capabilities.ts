import { ScoreError } from './errors'
import { findXmlChild, findXmlChildren } from './musicXml'

export function assertSinglePart(document: Document): void {
  if (findXmlChildren(document.documentElement, 'part').length !== 1)
    throw new ScoreError('multipleParts')
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
  if (Array.from(document.querySelectorAll('key')).some((key) => !findXmlChild(key, 'fifths')))
    throw new ScoreError('nonstandardKey')
  if (!document.querySelector('part > measure')?.querySelector('attributes > key > fifths'))
    throw new ScoreError('initialKeyRequired')
  if (
    Array.from(document.querySelectorAll('harmony')).some(
      (harmony) => !findXmlChild(harmony, 'root'),
    )
  )
    throw new ScoreError('chordRootRequired')
}
