'use client'

import {
  fitMargins,
  MARGIN_STEP,
  maxMargin,
  PAGE_FORMATS,
  PAGE_ORIENTATIONS,
  type PageFormat,
  type PageMargin,
  withMargin,
} from '@/lib/pageFormats'

import { useT } from '@front/_components/i18n/I18nProvider'
import { Popover } from '@front/_components/ui/Popover/Popover'

import { usePageSettings } from '../page/PageSettingsProvider'
import styles from './PageSetup.module.css'

const FORMATS = Object.keys(PAGE_FORMATS) as PageFormat[]
// The margins set here; the side ones are on the ruler
const FIELDS = ['top', 'bottom'] as const satisfies PageMargin[]

/*
 * The page setup of the composition, from the toolbar: format, orientation, and the top and
 * bottom margins. Every change applies to the pages at once and saves on its own.
 */
export function PageSetup() {
  const t = useT()
  const { settings, change } = usePageSettings()
  const summary = t('editor.pageSetup.summary', {
    format: t(`editor.pageSetup.formats.${settings.format}`),
    orientation: t(`editor.pageSetup.${settings.orientation}`),
  })

  return (
    <Popover
      label={t('editor.pageSetup.open')}
      triggerClassName={styles.trigger}
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
            {FORMATS.map((format) => (
              <label key={format} className={styles.choice}>
                <input
                  type="radio"
                  name="page-format"
                  checked={settings.format === format}
                  onChange={() => change(fitMargins({ ...settings, format }))}
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
                  name="page-orientation"
                  checked={settings.orientation === orientation}
                  onChange={() => change(fitMargins({ ...settings, orientation }))}
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
              <label key={side} className={styles.field}>
                {t(`editor.pageSetup.${side}`)}
                <span className={styles.number}>
                  <input
                    type="number"
                    min={0}
                    max={maxMargin(settings, side)}
                    step={MARGIN_STEP}
                    value={settings.margins[side]}
                    onChange={(event) => {
                      const value = event.target.valueAsNumber
                      if (!Number.isNaN(value)) change(withMargin(settings, side, value))
                    }}
                  />
                  {t('editor.pageSetup.unit')}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>
    </Popover>
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
