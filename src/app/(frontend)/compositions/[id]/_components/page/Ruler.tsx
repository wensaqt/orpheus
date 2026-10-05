'use client'

import { type CSSProperties, type RefObject, useRef, useState } from 'react'

import { pageSize } from '@/lib/pageFormats'

import { MM_TO_PX } from '@front/_components/editor/pagination/pageGeometry'
import { useLocale, useT } from '@front/_components/i18n/I18nProvider'

import { useBinder } from '../binder/state/BinderProvider'
import { isWriting, useOpenEditor } from '../editorFocus'
import { useLayout } from './LayoutProvider'
import styles from './Ruler.module.css'
import {
  handleMax,
  handlePosition,
  handleValue,
  type RulerHandle,
  rulerLabels,
  valueAfterKey,
  valueAt,
  withHandleValue,
} from './rulerGeometry'

// The indent's marker comes last, so it sits over the left margin's when they meet
const HANDLES: RulerHandle[] = ['left', 'right', 'indent']

/*
 * The ruler over the sheet, as wide as the page and right above it (so they line up whatever
 * the window): centimetres counted from the left margin, the margins shaded, a triangle on
 * each side margin, and above the left one a small bar for the first-line indent. Each handle
 * drags (or moves with the keyboard); the pages follow while dragging, and the layout saves
 * once the hand stops. It stays on screen under the header while the pages scroll.
 */
export function Ruler() {
  const t = useT()
  const { layout } = useLayout()
  const { activeDocumentId } = useBinder()
  const ruler = useRef<HTMLDivElement>(null)
  // Nothing to measure without a document (an empty binder)
  if (activeDocumentId === null) return null
  const { width } = pageSize(layout.page)
  const { left, right } = layout.page.margins
  const style = {
    '--ruler-width': `${width}mm`,
    '--margin-left': `${left}mm`,
    '--margin-right': `${right}mm`,
    '--first-line-indent': `${layout.typography.firstLineIndent}mm`,
  } as CSSProperties

  return (
    <div
      ref={ruler}
      role="group"
      aria-label={t('editor.ruler.label')}
      className={styles.ruler}
      style={style}
    >
      <div className={styles.scale} aria-hidden="true">
        {rulerLabels(width, left).map(({ at, label }) => (
          <span key={at} className={styles.label} style={{ '--at': `${at}mm` } as CSSProperties}>
            {label}
          </span>
        ))}
      </div>
      {HANDLES.map((handle) => (
        <Handle key={handle} handle={handle} ruler={ruler} />
      ))}
    </div>
  )
}

function Handle({
  handle,
  ruler,
}: {
  handle: RulerHandle
  ruler: RefObject<HTMLDivElement | null>
}) {
  const t = useT()
  const locale = useLocale()
  const { layout, change } = useLayout()
  const editor = useOpenEditor()
  const [dragging, setDragging] = useState(false)
  // How far from the handle's mark the pointer took it: the mark does not jump to the pointer
  const grab = useRef(0)
  const value = handleValue(handle, layout)
  const max = handleMax(handle, layout)
  const label = t(`editor.ruler.${handle}`)
  const valueText = t('editor.ruler.value', { value: value.toLocaleString(locale) })

  // Where the pointer is on the ruler, in millimetres from the page's left edge
  const pointerAt = (clientX: number) =>
    (clientX - (ruler.current?.getBoundingClientRect().left ?? 0)) / MM_TO_PX

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-orientation="horizontal"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={valueText}
      className={styles.handle}
      data-handle={handle}
      data-dragging={dragging}
      onPointerDown={(event) => {
        if (event.button !== 0) return
        /*
         * No text selection, and the focus stays where it is: a writer in the text stays
         * there, the caret following the text as it moves; else the handle takes it (for
         * the keyboard next)
         */
        event.preventDefault()
        event.currentTarget.setPointerCapture(event.pointerId)
        if (!isWriting(editor)) event.currentTarget.focus()
        grab.current = pointerAt(event.clientX) - handlePosition(handle, layout)
        setDragging(true)
      }}
      onPointerMove={(event) => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
        const position = pointerAt(event.clientX) - grab.current
        change((current) => withHandleValue(handle, current, valueAt(handle, position, current)))
      }}
      onPointerUp={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}
      onKeyDown={(event) => {
        const next = valueAfterKey(handle, event, value, max)
        if (next === null) return
        event.preventDefault()
        change((current) => withHandleValue(handle, current, next))
      }}
    >
      <span className={styles.tooltip} aria-hidden="true">
        {t('editor.ruler.tooltip', { label, value: valueText })}
      </span>
    </div>
  )
}
