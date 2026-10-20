import type { MeasureAction } from '@/lib/scores/measures'
import type { useScoreMeasures } from './useScoreMeasures'

import { useT } from '@front/_components/i18n/I18nProvider'
import { Button } from '@front/_components/ui/Button/Button'
import { SelectField } from '@front/_components/ui/SelectField/SelectField'

import styles from './ScoreDocument.module.css'

type Props = Pick<ReturnType<typeof useScoreMeasures>, 'measures' | 'issue'> & {
  selectedIndex: number | null
  onSelect: (index: number) => void
  onEdit: (action: MeasureAction) => void
}

export function MeasureControls({ measures, issue, selectedIndex, onSelect, onEdit }: Props) {
  const t = useT()
  const index = Math.min(selectedIndex ?? 0, Math.max(0, measures.length - 1))
  return (
    <>
      <p className={styles.hint}>{t('score.measuresHint')}</p>
      {issue ? <p role="alert">{issue}</p> : null}
      <Button onClick={() => onEdit({ type: 'append' })} disabled={!!issue}>
        {t('score.appendMeasure')}
      </Button>
      <SelectField
        label={t('score.selectedMeasure')}
        value={index}
        onChange={(event) => onSelect(Number(event.target.value))}
        disabled={!!issue}
      >
        {measures.map((measure) => (
          <option key={measure.index} value={measure.index}>
            {t('score.measureNumber', { number: measure.number })}
          </option>
        ))}
      </SelectField>
      <div className={styles.actions}>
        <Button
          variant="ghost"
          disabled={measures.length <= 1}
          onClick={() => onEdit({ type: 'delete', index })}
        >
          {t('score.deleteMeasure')}
        </Button>
      </div>
      <p className={styles.hint}>{t('score.deleteMeasureHint')}</p>
    </>
  )
}
