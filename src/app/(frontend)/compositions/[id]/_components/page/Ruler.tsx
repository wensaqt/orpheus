'use client'

import { type CSSProperties, type RefObject, useRef, useState } from 'react'

import {
  maxFirstLineIndent,
  maxMargin,
  pageSize,
  type PageSettings,
  withFirstLineIndent,
  withMargin,
} from '@/lib/pageFormats'

import { MM_TO_PX } from '@front/_components/editor/pagination/pageGeometry'
import { useLocale, useT } from '@front/_components/i18n/I18nProvider'

import { isWriting, useOpenEditor } from '../header/openEditor'
import { usePageSettings } from './PageSettingsProvider'
import styles from './Ruler.module.css'
import { type RulerHandle, rulerLabels, valueAfterKey, valueAt } from './rulerGeometry'

// The indent's marker comes last, so it sits over the left margin's when they meet
const HANDLES: RulerHandle[] = ['left', 'right', 'indent']

// Each handle's value, its upper bound, and the settings with a new value
const valueOf = (handle: RulerHandle, settings: PageSettings) =>
  handle === 'indent' ? settings.firstLineIndent : settings.margins[handle]

const maxOf = (handle: RulerHandle, settings: PageSettings) =>
  handle === 'indent' ? maxFirstLineIndent(settings) : maxMargin(settings, handle)

const withValue = (handle: RulerHandle, settings: PageSettings, value: number) =>
  handle === 'indent' ? withFirstLineIndent(settings, value) : withMargin(settings, handle, value)

/*
 * The ruler over the sheet, as wide as the page: centimetres counted from the left margin,
 * the margins shaded, a triangle on each side margin, and above the left one a small bar for
 * the first-line indent. Each handle drags (or moves with the keyboard); the pages follow
 * while dragging, and the settings save once the hand stops.
 */
export function Ruler() {
  const t = useT()
  const { settings } = usePageSettings()
  const ruler = useRef<HTMLDivElement>(null)
  const { width } = pageSize(settings)
  const { left, right } = settings.margins
  const style = {
    '--ruler-width': `${width}mm`,
    '--margin-left': `${left}mm`,
    '--margin-right': `${right}mm`,
    '--first-line-indent': `${settings.firstLineIndent}mm`,
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
  const { settings, change } = usePageSettings()
  const editor = useOpenEditor()
  const [dragging, setDragging] = useState(false)
  const value = valueOf(handle, settings)
  const max = maxOf(handle, settings)
  const label = t(`editor.ruler.${handle}`)
  const valueText = t('editor.ruler.value', { value: value.toLocaleString(locale) })

  const set = (next: number) => change(withValue(handle, settings, next))
  // The value under the pointer, from the ruler's own position on screen
  const moveTo = (clientX: number) => {
    const bounds = ruler.current?.getBoundingClientRect()
    if (!bounds) return
    const pointer = (clientX - bounds.left) / MM_TO_PX
    set(valueAt(handle, pointer, { width: pageSize(settings).width, left: settings.margins.left }))
  }

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
        setDragging(true)
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) moveTo(event.clientX)
      }}
      onPointerUp={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}
      onKeyDown={(event) => {
        const next = valueAfterKey(handle, event, value, max)
        if (next === null) return
        event.preventDefault()
        set(next)
      }}
    >
      <span className={styles.tooltip} aria-hidden="true">
        {t('editor.ruler.tooltip', { label, value: valueText })}
      </span>
    </div>
  )
}
