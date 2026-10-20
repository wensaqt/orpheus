import type { MeasureAction } from '@/lib/scores/measures'
import { useT } from '@front/_components/i18n/I18nProvider'
import { Button } from '@front/_components/ui/Button/Button'
import { IconButton } from '@front/_components/ui/IconButton/IconButton'
import styles from './ScoreDocument.module.css'

export function MeasureActions({
  measure,
  canDelete,
  disabled,
  onEdit,
  onCorrect,
  onClose,
}: {
  measure: { index: number; number: string }
  canDelete: boolean
  disabled: boolean
  onEdit: (action: MeasureAction) => void
  onCorrect: () => void
  onClose: () => void
}) {
  const t = useT()
  return (
    <div className={styles.measureActions} role="group" aria-label={t('score.measureActions')}>
      <strong>{t('score.measureNumber', { number: measure.number })}</strong>
      <Button variant="ghost" disabled={disabled} onClick={onCorrect}>
        {t('score.editMeasureNotes')}
      </Button>
      <Button
        variant="ghost"
        disabled={disabled}
        onClick={() => onEdit({ type: 'insertAfter', index: measure.index })}
      >
        {t('score.insertMeasureAfter')}
      </Button>
      <Button
        variant="ghost"
        disabled={disabled}
        onClick={() => onEdit({ type: 'duplicate', index: measure.index })}
      >
        {t('score.duplicateMeasure')}
      </Button>
      <Button
        variant="ghost"
        tone="danger"
        disabled={disabled || !canDelete}
        onClick={() => onEdit({ type: 'delete', index: measure.index })}
      >
        {t('score.deleteMeasure')}
      </Button>
      <IconButton
        label={t('score.deselectMeasure')}
        icon={<span aria-hidden="true">×</span>}
        onClick={onClose}
      />
    </div>
  )
}
