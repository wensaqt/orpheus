import { ScoreError } from './errors'
import { STEPS, NATURAL, type Pitch, type Step, type Interval } from './model'
import { child, required, setValue, value } from './musicXml'

export function readPitch(pitch: Element): Pitch {
  const step = required(pitch, 'step') as Step
  const alter = Number(value(pitch, 'alter') ?? 0)
  const octave = Number(required(pitch, 'octave'))
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

export function shiftPitch(pitch: Pitch, interval: Interval): Pitch {
  const index = STEPS.indexOf(pitch.step) + pitch.octave * 7 + interval.diatonic
  // TODO : enlever les magic numbers
  const targetStep = ((index % 7) + 7) % 7
  const octave = Math.floor(index / 7)
  const oldIndex = STEPS.indexOf(pitch.step)
  const semitone = pitch.octave * 12 + NATURAL[oldIndex] + pitch.alter + interval.semitones
  const alter = semitone - (octave * 12 + NATURAL[targetStep])
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
