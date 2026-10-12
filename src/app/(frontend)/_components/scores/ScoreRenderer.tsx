// Used inside client boundaries; callback props never cross the server boundary.
import { useEffect, useEffectEvent, useRef, useState, type MouseEvent } from 'react'

import { createNotePicker } from './scoreNotePicking'
import { renderScoreXml, type ScoreRenderState } from './scoreRendering'
import { useT } from '@front/_components/i18n/I18nProvider'
import { scoreErrorMessage } from './scoreErrorMessage'

type ScoreRendererProps = {
  xml: string
  className?: string
  onNoteClick?: (index: number) => void
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

  useEffect(() => {
    let canceled = false
    const container = ref.current
    if (!container) return
    container.replaceChildren()
    setRenderedPicker(null)
    setError(null)
    report({ xml, status: 'loading' })
    void renderScoreXml(xml, container, () => canceled)
      .then((rendered) => {
        if (!rendered || canceled) return
        const { display, osmd } = rendered
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

  function handleNoteClick(event: MouseEvent<HTMLDivElement>) {
    if (!onNoteClick || !picker) return
    const index = picker(event.nativeEvent)
    if (index !== null) onNoteClick(index)
  }

  return (
    <>
      {error && <p role="alert">{t('score.renderError', { detail: error })}</p>}
      <div
        ref={ref}
        className={className}
        data-selectable={onNoteClick && picker ? 'true' : undefined}
        onClick={handleNoteClick}
      />
    </>
  )
}
