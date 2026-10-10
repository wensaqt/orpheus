import { MAX_BINDER_TITLE_LENGTH } from '@/lib/binder/constants'

import { readScoreMetadata } from './validation'
import { INSTRUMENTS, INTERVALS, type Instrument } from './model'

export type ScoreVariant =
  { mode: 'key'; intervalIndex: number } | { mode: 'instrument'; instrument: Instrument }

const INSTRUMENT_CODES = new Set(Object.values(INSTRUMENTS).map(({ code }) => code))

function baseTitle(title: string): string {
  const match = /^(.*) \(([^()]*)\)$/.exec(title)
  if (!match) return title
  return INSTRUMENT_CODES.has(match[2]) || match[2] === 'Sans alt.' || /^[0-7][♯♭]$/.test(match[2])
    ? match[1]
    : title
}

export function scoreVariantTitle(
  sourceTitle: string,
  variant: ScoreVariant,
  scoreXml: string,
): string | null {
  if (!variant || (variant.mode !== 'key' && variant.mode !== 'instrument')) return null
  let code: string | undefined
  if (variant.mode === 'key') {
    if (!Number.isInteger(variant.intervalIndex) || !INTERVALS[variant.intervalIndex]) return null
    const { fifths: count } = readScoreMetadata(scoreXml)
    if (count === null || Math.abs(count) > 7) return null
    code = count === 0 ? 'Sans alt.' : `${Math.abs(count)}${count < 0 ? '♭' : '♯'}`
  } else if (Object.hasOwn(INSTRUMENTS, variant.instrument)) {
    code = INSTRUMENTS[variant.instrument].code
  }
  if (!code) return null
  const suffix = ` (${code})`
  return `${baseTitle(sourceTitle)
    .slice(0, MAX_BINDER_TITLE_LENGTH - suffix.length)
    .trimEnd()}${suffix}`
}
