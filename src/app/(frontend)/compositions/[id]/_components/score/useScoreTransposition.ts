import { useCallback, useRef, useState } from 'react'

import {
  adaptToInstrument,
  INTERVALS,
  transposeKey,
  type Instrument,
  type SourceInstrument,
} from '@/lib/scores'
import type { ScoreVariant } from '@/lib/scores/variantTitle'
import type { ScoreRenderState } from '@front/_components/scores/scoreRendering'
import { useT } from '@front/_components/i18n/I18nProvider'
import { scoreErrorMessage } from '@front/_components/scores/scoreErrorMessage'

export function useScoreTransposition(
  xml: string,
  create: (xml: string, variant: ScoreVariant) => Promise<boolean>,
  onError: (message: string | null) => void,
) {
  const t = useT()
  const [mode, setMode] = useState<'key' | 'instrument'>('key')
  const [intervalIndex, setIntervalIndex] = useState(1)
  const [instrument, setInstrument] = useState<Instrument>('trumpet-bb')
  const [sourceInstrument, setSourceInstrument] = useState<SourceInstrument | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [renderState, setRenderState] = useState<ScoreRenderState | null>(null)
  const [applying, setApplying] = useState(false)
  const inFlight = useRef(false)
  const canApply =
    preview !== null && renderState?.xml === preview && renderState.status === 'ready'

  const reset = useCallback(() => setPreview(null), [])
  function makePreview() {
    try {
      const next =
        mode === 'key'
          ? transposeKey(xml, INTERVALS[intervalIndex])
          : adaptToInstrument(xml, instrument, sourceInstrument)
      setPreview(next)
      onError(null)
    } catch (cause) {
      reset()
      onError(scoreErrorMessage(cause, t, 'transpositionFailed'))
    }
  }
  async function apply() {
    if (!canApply || preview === null || inFlight.current) return
    inFlight.current = true
    setApplying(true)
    try {
      const created = await create(
        preview,
        mode === 'key' ? { mode, intervalIndex } : { mode, instrument },
      )
      if (!created) onError(t('score.errors.creationFailed'))
    } catch {
      onError(t('score.errors.creationFailed'))
    } finally {
      inFlight.current = false
      setApplying(false)
    }
  }
  return {
    preview,
    reset,
    canApply,
    applying,
    onRenderState: setRenderState,
    controls: {
      settings: { mode, intervalIndex, instrument, sourceInstrument },
      actions: {
        onModeChange: (next: 'key' | 'instrument') => {
          setMode(next)
          reset()
        },
        onIntervalChange: (next: number) => {
          setIntervalIndex(next)
          reset()
        },
        onInstrumentChange: (next: Instrument) => {
          setInstrument(next)
          reset()
        },
        onSourceInstrumentChange: (next: SourceInstrument) => {
          setSourceInstrument(next)
          reset()
        },
        onPreview: makePreview,
        onApply: () => void apply(),
      },
    },
    resetSource: () => setSourceInstrument(null),
  }
}
