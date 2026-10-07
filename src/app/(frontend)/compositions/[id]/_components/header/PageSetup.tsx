'use client'

import {
  type ChangeEvent,
  type KeyboardEvent,
  type Ref,
  type RefObject,
  useId,
  useRef,
  useState,
} from 'react'

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
import { Popover, type PopoverHandle } from '@front/_components/ui/Popover/Popover'

import { useHistoryState } from '../history/HistoryProvider'
import { useLayout } from '../page/LayoutProvider'
import styles from './PageSetup.module.css'

// The margins set here; the side ones are on the ruler
const FIELDS = ['top', 'bottom'] as const satisfies PageMargin[]

type PageSetupProps = {
  // Opens the panel (from the File menu)
  ref: Ref<PopoverHandle>
  // What the panel opens below
  anchor: RefObject<Element | null>
  // Closed in place: back to the text, if the writer came from there
  onClose: () => void
}

/*
 * The page setup of the composition, from the File menu: format, orientation, and the top and
 * bottom margins. Every change applies to the pages at once and saves on its own.
 */
export function PageSetup({ ref, anchor, onClose }: PageSetupProps) {
  const t = useT()
  const id = useId()
  const { layout, change } = useLayout()
  const { page } = layout
  // The page changed, then everything fitted to it (margins, then the indent)
  const changePage = (update: (page: PageSettings) => PageSettings, group?: object) =>
    change((current) => fitLayout({ ...current, page: update(current.page) }), group)

  return (
    <Popover ref={ref} anchor={anchor} label={t('editor.pageSetup.open')} onCloseInPlace={onClose}>
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
                onValue={(value, group) =>
                  changePage((current) => withMargin(current, side, value), group)
                }
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
  onValue: (value: number, group: object) => void
}) {
  const { generation } = useHistoryState()
  const group = useRef<object>({})
  const [draft, setDraft] = useState<{ value: string; generation: number } | null>(null)
  const showValue = () => {
    setDraft(null)
    group.current = {}
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setDraft({ value: event.target.value, generation })
    const typed = event.target.valueAsNumber
    if (!Number.isNaN(typed)) onValue(typed, group.current)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') showValue()
  }

  return (
    <label className={styles.field}>
      {label}
      <span className={styles.number}>
        <input
          type="number"
          data-layout-history=""
          min={0}
          max={max}
          step={MARGIN_STEP}
          value={draft?.generation === generation ? draft.value : value}
          onChange={handleChange}
          onBlur={showValue}
          onKeyDown={handleKeyDown}
        />
        {unit}
      </span>
    </label>
  )
}
