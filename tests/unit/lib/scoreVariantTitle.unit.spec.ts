import { expect, it } from 'vitest'

import { adaptToInstrument, INTERVALS, transposeKey } from '@/lib/scores/prototype'
import { SAMPLE_SCORE } from '@/lib/scores/sample'
import { scoreVariantTitle } from '@/lib/scores/variantTitle'

it('keeps one short, current score qualifier through repeated transpositions', () => {
  const first = transposeKey(SAMPLE_SCORE, INTERVALS[1])
  const second = transposeKey(first, INTERVALS[1])
  const trumpet = adaptToInstrument(second, 'trumpet-bb', 'concert')
  const concert = adaptToInstrument(trumpet, 'concert')

  const firstTitle = scoreVariantTitle('Mélodie', { mode: 'key', intervalIndex: 1 }, first)
  const secondTitle = scoreVariantTitle(firstTitle!, { mode: 'key', intervalIndex: 1 }, second)
  const trumpetTitle = scoreVariantTitle(
    secondTitle!,
    { mode: 'instrument', instrument: 'trumpet-bb' },
    trumpet,
  )

  expect(firstTitle).toBe('Mélodie (2♯)')
  expect(secondTitle).toBe('Mélodie (4♯)')
  expect(trumpetTitle).toBe('Mélodie (Tpt Si♭)')
  expect(
    scoreVariantTitle(trumpetTitle!, { mode: 'instrument', instrument: 'concert' }, concert),
  ).toBe('Mélodie (Ut)')
})
