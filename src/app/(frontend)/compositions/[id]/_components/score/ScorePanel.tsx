import type { ComponentProps } from 'react'

import { useT } from '@front/_components/i18n/I18nProvider'
import { Heading } from '@front/_components/ui/Heading/Heading'
import { IconButton } from '@front/_components/ui/IconButton/IconButton'

import type { ScorePanel as Panel } from './ScoreCommands'
import { PitchCorrectionControls, TranspositionControls } from './ScoreControls'
import styles from './ScoreDocument.module.css'

type ScorePanelProps = {
  panel: Panel
  onClose: () => void
  disabled: boolean
  correction: ComponentProps<typeof PitchCorrectionControls>
  transposition: ComponentProps<typeof TranspositionControls>
}

export function ScorePanel({
  panel,
  onClose,
  disabled,
  correction,
  transposition,
}: ScorePanelProps) {
  const t = useT()
  if (panel === null) return null
  const title = panel === 'correct' ? t('score.correctPitch') : t('score.transpose')
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
        ) : (
          <TranspositionControls {...transposition} />
        )}
      </fieldset>
    </section>
  )
}
