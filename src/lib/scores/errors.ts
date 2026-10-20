export type ScoreErrorCode =
  | 'invalidXml'
  | 'fileTooLarge'
  | 'invalidRoot'
  | 'invalidParts'
  | 'noMeasures'
  | 'measureMissing'
  | 'lastMeasure'
  | 'unsupportedMeasureStructure'
  | 'measureEditFailed'
  | 'unsupportedNoteStructure'
  | 'noNoteSpace'
  | 'noteEditFailed'
  | 'missingField'
  | 'multipleParts'
  | 'backup'
  | 'forward'
  | 'rhythmicModification'
  | 'unpitched'
  | 'nonstandardKey'
  | 'initialKeyRequired'
  | 'chordRootRequired'
  | 'invalidPitch'
  | 'noteMissing'
  | 'unsupportedPitch'
  | 'extremeAccidental'
  | 'sourceRequired'
  | 'unsupportedTranspose'
  | 'lateTranspose'
  | 'changingTranspose'
  | 'unsupportedVoices'
  | 'keyOutOfRange'
  | 'unsupportedChord'
  | 'compressedFile'
  | 'noRenderArea'
  | 'correctionFailed'
  | 'importFailed'
  | 'renderFailed'
  | 'transpositionFailed'
  | 'creationFailed'

// Domain errors carry stable codes; the UI owns their translation.
export class ScoreError extends Error {
  constructor(
    readonly code: ScoreErrorCode,
    readonly params: Record<string, string | number> = {},
  ) {
    super(code)
    this.name = 'ScoreError'
  }
}
