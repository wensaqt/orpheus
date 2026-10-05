'use client'

import { useId, useState } from 'react'

import { fitLayout } from '@/lib/layout'
import {
  MARGIN_STEP,
  maxMargin,
  PAGE_FORMAT_NAMES,
  PAGE_ORIENTATIONS,
  type PageMargin,
  type PageSettings,
  withMargin,
} from '@/lib/pageFormats'

import { useT } from '@front/_components/i18n/I18nProvider'
import { Popover } from '@front/_components/ui/Popover/Popover'

import { useFocusReturn } from '../editorFocus'
import { useLayout } from '../page/LayoutProvider'
import styles from './PageSetup.module.css'

// The margins set here; the side ones are on the ruler
const FIELDS = ['top', 'bottom'] as const satisfies PageMargin[]

/*
 * The page setup of the composition, from the toolbar: format, orientation, and the top and
 * bottom margins. Every change applies to the pages at once and saves on its own; once closed,
 * the writer is back in the text if they came from there.
 */
export function PageSetup() {
  const t = useT()
  const id = useId()
  const { layout, change } = useLayout()
  const { page } = layout
  // Back to the text once closed, if the writer came from there
  const focus = useFocusReturn()
  // The page changed, then everything fitted to it (margins, then the indent)
  const changePage = (update: (page: PageSettings) => PageSettings) =>
    change((current) => fitLayout({ ...current, page: update(current.page) }))
  const summary = t('editor.pageSetup.summary', {
    format: t(`editor.pageSetup.formats.${page.format}`),
    orientation: t(`editor.pageSetup.${page.orientation}`),
  })

  return (
    <Popover
      label={t('editor.pageSetup.open')}
      triggerClassName={styles.trigger}
      onTriggerPointerDown={focus.remember}
      onCloseInPlace={focus.restore}
      trigger={
        <>
          <PageIcon />
          <span className="visually-hidden">{t('editor.pageSetup.open')}</span>
          {summary}
        </>
      }
    >
      <div className={styles.panel}>
        <fieldset className={styles.group}>
          <legend className={styles.legend}>{t('editor.pageSetup.format')}</legend>
          <div className={styles.choices}>
            {PAGE_FORMAT_NAMES.map((format) => (
              <label key={format} className={styles.choice}>
                <input
                  type="radio"
                  name={`${id}-format`}
                  checked={page.format === format}
                  onChange={() => changePage((current) => ({ ...current, format }))}
                />
                {t(`editor.pageSetup.formats.${format}`)}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className={styles.group}>
          <legend className={styles.legend}>{t('editor.pageSetup.orientation')}</legend>
          <div className={styles.choices}>
            {PAGE_ORIENTATIONS.map((orientation) => (
              <label key={orientation} className={styles.choice}>
                <input
                  type="radio"
                  name={`${id}-orientation`}
                  checked={page.orientation === orientation}
                  onChange={() => changePage((current) => ({ ...current, orientation }))}
                />
                {t(`editor.pageSetup.${orientation}`)}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className={styles.group}>
          <legend className={styles.legend}>{t('editor.pageSetup.margins')}</legend>
          <div className={styles.fields}>
            {FIELDS.map((side) => (
              <MarginField
                key={side}
                label={t(`editor.pageSetup.${side}`)}
                unit={t('editor.pageSetup.unit')}
                value={page.margins[side]}
                max={maxMargin(page, side)}
                onValue={(value) => changePage((current) => withMargin(current, side, value))}
              />
            ))}
          </div>
        </fieldset>
      </div>
    </Popover>
  )
}

/*
 * A margin in millimetres. What is typed stays as typed while the field has the focus (it may
 * be empty, or on its way to a number); each number in it applies at once, within bounds, and
 * the field shows the value applied once left (or on Enter)
 */
function MarginField({
  label,
  unit,
  value,
  max,
  onValue,
}: {
  label: string
  unit: string
  value: number
  max: number
  onValue: (value: number) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <label className={styles.field}>
      {label}
      <span className={styles.number}>
        <input
          type="number"
          min={0}
          max={max}
          step={MARGIN_STEP}
          value={draft ?? value}
          onChange={(event) => {
            setDraft(event.target.value)
            const typed = event.target.valueAsNumber
            if (!Number.isNaN(typed)) onValue(typed)
          }}
          onBlur={() => setDraft(null)}
          onKeyDown={(event) => event.key === 'Enter' && setDraft(null)}
        />
        {unit}
      </span>
    </label>
  )
}

// A sheet with a folded corner
function PageIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M4 1.5h5.5L12.5 4.5v10h-8.5z M9.5 1.5v3h3"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  )
}
