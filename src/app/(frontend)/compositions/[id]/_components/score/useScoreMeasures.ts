import { useMemo, type RefObject } from 'react'

import { editScoreMeasures, scoreMeasures, type MeasureAction } from '@/lib/scores/measures'
import { useT } from '@front/_components/i18n/I18nProvider'
import { scoreErrorMessage } from '@front/_components/scores/scoreErrorMessage'

type Options = {
  content: { xml: string; xmlRef: RefObject<string> }
  selection: { index: number | null; select: (index: number | null) => void }
  enabled: boolean
  importInProgress: RefObject<boolean>
  onChange: (xml: string) => void
  onError: (message: string) => void
}

export function useScoreMeasures({
  content,
  selection,
  enabled,
  importInProgress,
  onChange,
  onError,
}: Options) {
  const t = useT()
  // DOM inspection starts after a client interaction and is shared by the panel and action bar.
  const inspection = useMemo(() => {
    try {
      return { measures: enabled ? scoreMeasures(content.xml) : [], issue: null }
    } catch (cause) {
      return { measures: [], issue: scoreErrorMessage(cause, t, 'measureEditFailed') }
    }
  }, [content.xml, enabled, t])

  function edit(action: MeasureAction) {
    if (importInProgress.current) return
    try {
      const next = editScoreMeasures(content.xmlRef.current, action)
      const count = scoreMeasures(next).length
      onChange(next)
      const index =
        action.type === 'append'
          ? count - 1
          : action.type === 'delete'
            ? Math.min(action.index, count - 1)
            : action.index + 1
      selection.select(index)
    } catch (cause) {
      onError(scoreErrorMessage(cause, t, 'measureEditFailed'))
    }
  }

  return {
    ...inspection,
    active: selection.index === null ? null : (inspection.measures[selection.index] ?? null),
    edit,
  }
}
