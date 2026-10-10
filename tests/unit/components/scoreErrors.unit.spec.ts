import { expect, it } from 'vitest'

import { ScoreError } from '@/lib/scores/errors'
import { MAX_SCORE_BYTES } from '@/lib/scores/validation'
import { scoreErrorMessage } from '@front/_components/scores/scoreErrorMessage'
import { createT } from '@front/_lib/i18n'

it('translates domain error codes at the UI boundary', () => {
  const error = new ScoreError('sourceRequired')
  expect(scoreErrorMessage(error, createT('en'), 'importFailed')).toBe(
    'Choose the source instrument for this score.',
  )
  expect(scoreErrorMessage(error, createT('fr'), 'importFailed')).toBe(
    'Choisissez l’instrument source de cette partition.',
  )
})

it('formats the file limit using decimal megabytes in both languages', () => {
  const error = new ScoreError('fileTooLarge', { size: MAX_SCORE_BYTES / 1_000_000 })
  expect(scoreErrorMessage(error, createT('en'), 'importFailed')).toContain('2 MB')
  expect(scoreErrorMessage(error, createT('fr'), 'importFailed')).toContain('2 Mo')
})
