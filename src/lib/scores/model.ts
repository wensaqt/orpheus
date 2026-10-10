export type Pitch = { step: Step; alter: number; octave: number }
export type Step = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B'
export type Interval = { diatonic: number; semitones: number }

export const INTERVALS = [
  { id: 'none', diatonic: 0, semitones: 0 },
  { id: 'majorSecondUp', diatonic: 1, semitones: 2 },
  { id: 'minorThirdUp', diatonic: 2, semitones: 3 },
  { id: 'majorThirdUp', diatonic: 2, semitones: 4 },
  { id: 'perfectFourthUp', diatonic: 3, semitones: 5 },
  { id: 'perfectFifthUp', diatonic: 4, semitones: 7 },
  { id: 'octaveUp', diatonic: 7, semitones: 12 },
  { id: 'majorSecondDown', diatonic: -1, semitones: -2 },
  { id: 'minorThirdDown', diatonic: -2, semitones: -3 },
  { id: 'perfectFourthDown', diatonic: -3, semitones: -5 },
  { id: 'octaveDown', diatonic: -7, semitones: -12 },
] as const satisfies readonly (Interval & { id: string })[]

export const INSTRUMENT_IDS = ['concert', 'trumpet-bb', 'alto-sax-eb', 'tenor-sax-bb'] as const
export type Instrument = (typeof INSTRUMENT_IDS)[number]

export const INSTRUMENTS: Record<
  Instrument,
  { label: string; code: string; writtenToSounding: Interval }
> = {
  concert: { label: 'Concert pitch', code: 'Ut', writtenToSounding: INTERVALS[0] },
  'trumpet-bb': {
    label: 'B♭ trumpet',
    code: 'Tpt Si♭',
    writtenToSounding: { diatonic: -1, semitones: -2 },
  },
  'alto-sax-eb': {
    label: 'E♭ alto saxophone',
    code: 'Sax alto Mi♭',
    writtenToSounding: { diatonic: -5, semitones: -9 },
  },
  'tenor-sax-bb': {
    label: 'B♭ tenor saxophone',
    code: 'Sax tén. Si♭',
    writtenToSounding: { diatonic: -8, semitones: -14 },
  },
}

export const STEPS: Step[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
export const NATURAL = [0, 2, 4, 5, 7, 9, 11]
export const FIFTH_TONICS: [Step, number][] = [
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
