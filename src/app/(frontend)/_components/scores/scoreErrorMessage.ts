import { ScoreError, type ScoreErrorCode } from '@/lib/scores/errors'
import type { Translate } from '@front/_lib/i18n'

export function scoreErrorMessage(cause: unknown, t: Translate, fallback: ScoreErrorCode): string {
  if (cause instanceof ScoreError) return t(`score.errors.${cause.code}`, cause.params)
  // Keep third-party diagnostics intact; Orpheus errors use translated domain codes.
  return cause instanceof Error ? cause.message : t(`score.errors.${fallback}`)
}
