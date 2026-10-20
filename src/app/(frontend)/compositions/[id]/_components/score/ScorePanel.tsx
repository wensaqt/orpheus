import type { ComponentProps } from 'react'

import { useT } from '@front/_components/i18n/I18nProvider'
import { Heading } from '@front/_components/ui/Heading/Heading'
import { IconButton } from '@front/_components/ui/IconButton/IconButton'

import type { ScorePanel as Panel } from './ScoreCommands'
import { PitchCorrectionControls, TranspositionControls } from './ScoreControls'
import { MeasureControls } from './MeasureControls'
import styles from './ScoreDocument.module.css'

type ScorePanelProps = {
  panel: Panel
  onClose: () => void
  disabled: boolean
  correction: ComponentProps<typeof PitchCorrectionControls>
  transposition: ComponentProps<typeof TranspositionControls>
  measures: ComponentProps<typeof MeasureControls>
}

export function ScorePanel({
  panel,
  onClose,
  disabled,
  correction,
  transposition,
  measures,
}: ScorePanelProps) {
  const t = useT()
  if (panel === null) return null
  const titles = {
    correct: t('score.correctPitch'),
    transpose: t('score.transpose'),
    measures: t('score.manageMeasures'),
  }
  const title = titles[panel]
  return (
    <section className={styles.panel} aria-label={title}>
      <div className={styles.panelHead}>
        <Heading level={2} variant="panel">
          {title}
        </Heading>
        <IconButton
          label={t('score.closePanel')}
          tooltipAlign="end"
          icon={<span aria-hidden="true">×</span>}
          onClick={onClose}
        />
      </div>
      <fieldset disabled={disabled} className={styles.panelControls}>
        {panel === 'correct' ? (
          <PitchCorrectionControls {...correction} />
        ) : panel === 'transpose' ? (
          <TranspositionControls {...transposition} />
        ) : (
          <MeasureControls {...measures} />
        )}
      </fieldset>
    </section>
  )
}
