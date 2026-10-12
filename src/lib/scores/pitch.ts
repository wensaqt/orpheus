import { ScoreError } from './errors'
import { STEPS, NATURAL, type Pitch, type Step, type Interval } from './model'
import { findXmlChild, requireXmlValue, setXmlValue, readXmlValue } from './musicXml'

const DIATONIC_STEPS_PER_OCTAVE = STEPS.length
const SEMITONES_PER_OCTAVE = 12

export function readPitch(pitch: Element): Pitch {
  const step = requireXmlValue(pitch, 'step') as Step
  const alter = Number(readXmlValue(pitch, 'alter') ?? 0)
  const octave = Number(requireXmlValue(pitch, 'octave'))
  if (
    !STEPS.includes(step) ||
    !Number.isInteger(alter) ||
    Math.abs(alter) > 2 ||
    !Number.isInteger(octave)
  ) {
    throw new ScoreError('unsupportedPitch')
  }
  return { step, alter, octave }
}

export function writePitch(pitch: Element, next: Pitch): void {
  setXmlValue(pitch, 'step', next.step)
  let alter = findXmlChild(pitch, 'alter')
  if (next.alter === 0) alter?.remove()
  else {
    if (!alter) {
      alter = pitch.ownerDocument.createElement('alter')
      pitch.insertBefore(alter, findXmlChild(pitch, 'octave'))
    }
    alter.textContent = String(next.alter)
  }
  setXmlValue(pitch, 'octave', String(next.octave))
}

export function shiftPitch(pitch: Pitch, interval: Interval): Pitch {
  const index =
    STEPS.indexOf(pitch.step) + pitch.octave * DIATONIC_STEPS_PER_OCTAVE + interval.diatonic
  const targetStep =
    ((index % DIATONIC_STEPS_PER_OCTAVE) + DIATONIC_STEPS_PER_OCTAVE) % DIATONIC_STEPS_PER_OCTAVE
  const octave = Math.floor(index / DIATONIC_STEPS_PER_OCTAVE)
  const oldIndex = STEPS.indexOf(pitch.step)
  const semitone =
    pitch.octave * SEMITONES_PER_OCTAVE + NATURAL[oldIndex] + pitch.alter + interval.semitones
  const alter = semitone - (octave * SEMITONES_PER_OCTAVE + NATURAL[targetStep])
  if (Math.abs(alter) > 2) throw new ScoreError('extremeAccidental')
  return { step: STEPS[targetStep], alter, octave }
}

export function accidentalName(alter: number): string {
  return (
    { '-2': 'flat-flat', '-1': 'flat', 0: 'natural', 1: 'sharp', 2: 'double-sharp' } as Record<
      number,
      string
    >
  )[alter]
}
