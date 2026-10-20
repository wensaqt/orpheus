// Used inside client boundaries; callback props never cross the server boundary.
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type MouseEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'

import { classNames } from '@front/_lib/classNames'
import { createMeasureSelection } from './scoreMeasureSelection'
import styles from './ScoreRenderer.module.css'

import { createNotePicker } from './scoreNotePicking'
import { renderScoreXml, type ScoreRenderState } from './scoreRendering'
import { useT } from '@front/_components/i18n/I18nProvider'
import { scoreErrorMessage } from './scoreErrorMessage'

type ScoreRendererProps = {
  xml: string
  className?: string
  onNoteClick?: (index: number) => void
  selectedMeasure?: number | null
  onMeasureClick?: (index: number | null) => void
  measureActions?: ReactNode
  onRenderState?: (state: ScoreRenderState) => void
}

// Observe the content width, not the SVG height that rendering itself changes.
function observeScoreWidth(container: HTMLElement, redraw: () => void) {
  let width = Math.round(container.clientWidth)
  let frame = 0
  const observer = new ResizeObserver(([entry]) => {
    const next = Math.round(entry.contentRect.width)
    if (next <= 0 || next === width) return
    width = next
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(redraw)
  })
  observer.observe(container)
  return () => {
    observer.disconnect()
    cancelAnimationFrame(frame)
  }
}

function useRenderedScore(
  xml: string,
  measureSelectable: boolean,
  onRenderState: ScoreRendererProps['onRenderState'],
) {
  const t = useT()
  const ref = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [renderedPicker, setRenderedPicker] = useState<{
    xml: string
    pick: ReturnType<typeof createNotePicker>
    measures: ReturnType<typeof createMeasureSelection> | null
  } | null>(null)
  const selection = renderedPicker?.xml === xml ? renderedPicker : null
  const measureLabel = useEffectEvent((number: number) => t('score.measureNumber', { number }))

  const report = useEffectEvent((state: ScoreRenderState) => onRenderState?.(state))
  const reportError = useEffectEvent((cause: unknown) =>
    setError(scoreErrorMessage(cause, t, 'renderFailed')),
  )

  useEffect(() => {
    let canceled = false
    let stopObserving = () => {}
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
        const refreshSelection = () => {
          const pick = createNotePicker(display, xml, container, osmd)
          const measures = measureSelectable
            ? createMeasureSelection({ display, osmd, container, label: measureLabel })
            : null
          setRenderedPicker({ xml, pick, measures })
          report({ xml, status: 'ready' })
        }
        const redraw = () => {
          if (canceled) return
          setRenderedPicker(null)
          try {
            display.render()
            setError(null)
            refreshSelection()
          } catch (cause) {
            reportError(cause)
            report({ xml, status: 'error' })
          }
        }
        refreshSelection()
        stopObserving = observeScoreWidth(container, redraw)
      })
      .catch((cause: unknown) => {
        if (canceled) return
        reportError(cause)
        report({ xml, status: 'error' })
      })
    return () => {
      canceled = true
      stopObserving()
      container.replaceChildren()
    }
  }, [xml, measureSelectable])

  return { ref, error, selection }
}

export function ScoreRenderer({
  xml,
  className,
  onNoteClick,
  onRenderState,
  selectedMeasure = null,
  onMeasureClick,
  measureActions,
}: ScoreRendererProps) {
  const t = useT()
  const { ref, error, selection } = useRenderedScore(
    xml,
    onMeasureClick !== undefined,
    onRenderState,
  )
  const picker = selection?.pick

  useEffect(() => {
    selection?.measures?.select(selectedMeasure)
  }, [selection, selectedMeasure])

  function handleNoteClick(event: MouseEvent<HTMLDivElement>) {
    if (onMeasureClick && selection?.measures) {
      const index = selection.measures.pick(event.nativeEvent)
      selection.measures.focus(index, { preventScroll: true })
      onMeasureClick(index)
    }
    if (onNoteClick && picker) {
      const index = picker(event.nativeEvent)
      if (index !== null) onNoteClick(index)
    }
  }

  function handleMeasureKey(event: KeyboardEvent<HTMLDivElement>) {
    const target = event.target
    if (
      !(target instanceof SVGElement) ||
      target.dataset.scoreMeasure === undefined ||
      !selection?.measures
    )
      return
    const index = Number(target.dataset.scoreMeasure)
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onMeasureClick?.(index)
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      const next = Math.max(
        0,
        Math.min(selection.measures.count - 1, index + (event.key === 'ArrowLeft' ? -1 : 1)),
      )
      onMeasureClick?.(next)
      selection.measures.focus(next)
    }
  }

  const anchor = selectedMeasure === null ? null : selection?.measures?.anchor(selectedMeasure)
  return (
    <div className={styles.frame}>
      {error ? <p role="alert">{t('score.renderError', { detail: error })}</p> : null}
      <div
        ref={ref}
        data-score-renderer=""
        className={classNames(styles.renderer, className)}
        data-selectable={onNoteClick && picker ? 'true' : undefined}
        onClick={handleNoteClick}
        onKeyDown={handleMeasureKey}
      />
      {anchor && measureActions ? (
        <div className={styles.measureActions} style={anchor}>
          {measureActions}
        </div>
      ) : null}
    </div>
  )
}
