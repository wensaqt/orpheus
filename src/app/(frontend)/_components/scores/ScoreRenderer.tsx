'use client'

import { useEffect, useEffectEvent, useRef, useState } from 'react'

import { createNotePicker } from './scoreNotePicking'
import { DISPLAY_OPTIONS, type ScoreRenderState } from './scoreRendering'
import { useT } from '@front/_components/i18n/I18nProvider'
import { scoreErrorMessage } from './scoreErrorMessage'

type ScoreRendererProps = {
  xml: string
  className?: string
    // TODO: remove type warning if possible
  onNoteClick?: (index: number) => void
  // TODO: remove type warning if possible
  // Props must be serializable for components in the “use client” entry file. “onRenderState” is a function that’s not a Server Action. Rename “onRenderState” either to “action” or have its name end with “Action” e.g. “onRenderStateAction” to indicate it is a Server Action. (ts 71007)
  onRenderState?: (state: ScoreRenderState) => void
}

export function ScoreRenderer({ xml, className, onNoteClick, onRenderState }: ScoreRendererProps) {
  const t = useT()
  const ref = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [renderedPicker, setRenderedPicker] = useState<{
    xml: string
    pick: NonNullable<ReturnType<typeof createNotePicker>>
  } | null>(null)
  const picker = renderedPicker?.xml === xml ? renderedPicker.pick : null
  const report = useEffectEvent((state: ScoreRenderState) => onRenderState?.(state))
  const reportError = useEffectEvent((cause: unknown) =>
    setError(scoreErrorMessage(cause, t, 'renderFailed')),
  )

  //TODO: this useEffect feels heavy
  useEffect(() => {
    let canceled = false
    const container = ref.current
    if (!container) return
    container.replaceChildren()
    setRenderedPicker(null)
    setError(null)
    // TODO: add enum for report status
    report({ xml, status: 'loading' })
    // TODO: weird way to import module, investigate for a better solution
    void import('opensheetmusicdisplay')
      .then(async (osmd) => {
        if (canceled) return
        const display = new osmd.OpenSheetMusicDisplay(container, DISPLAY_OPTIONS)
        await display.load(xml)
        if (canceled) return
        display.render()
        const pick = createNotePicker(display, xml, container, osmd)
        if (pick) setRenderedPicker({ xml, pick })
        report({ xml, status: 'ready' })
      })
      .catch((cause: unknown) => {
        if (canceled) return
        reportError(cause)
        report({ xml, status: 'error' })
      })
    return () => {
      canceled = true
      container.replaceChildren()
    }
  }, [xml])

  return (
    <>
      {error && <p role="alert">{t('score.renderError', { detail: error })}</p>}
      <div
        ref={ref}
        className={className}
        data-selectable={onNoteClick && picker ? 'true' : undefined}
        // TODO: dedicated handler please
        onClick={(event) => {
          if (!onNoteClick || !picker) return
          const index = picker(event.nativeEvent)
          if (index !== null) onNoteClick(index)
        }}
      />
    </>
  )
}
