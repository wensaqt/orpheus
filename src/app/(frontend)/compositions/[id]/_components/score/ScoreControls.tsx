import type { Instrument, Pitch, ScoreNote, Step } from '@/lib/scores/prototype'
import { INSTRUMENTS, INTERVALS } from '@/lib/scores/prototype'

import { useT } from '@front/_components/i18n/I18nProvider'
import { Button } from '@front/_components/ui/Button/Button'
import { NumberStepper } from '@front/_components/ui/NumberStepper/NumberStepper'
import { SelectField } from '@front/_components/ui/SelectField/SelectField'

import styles from './ScoreDocument.module.css'

const STEPS: Step[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B']

export function PitchCorrectionControls({
  notes,
  issue,
  selectedIndex,
  onShowAll,
  onEdit,
}: {
  notes: ScoreNote[]
  issue: string | null
  selectedIndex: number | null
  onShowAll: () => void
  onEdit: (index: number, pitch: Pitch) => void
}) {
  const t = useT()
  const visibleNotes =
    selectedIndex === null ? notes : notes.filter(({ index }) => index === selectedIndex)
  return (
    <>
      <p className={styles.hint}>{issue ?? t('score.correctionLimit')}</p>
      <div className={styles.notes}>
        {visibleNotes.map(({ index, measure, pitch }) => {
          const name = t('score.noteInMeasure', { index: index + 1, measure })
          return (
            <div
              className={styles.note}
              key={index}
              data-note-index={index}
              data-selected={index === selectedIndex}
            >
              <span className={styles.noteName}>{name}</span>
              <SelectField
                aria-label={`${name} · ${t('score.pitchStep')}`}
                value={pitch.step}
                onChange={(event) => onEdit(index, { ...pitch, step: event.target.value as Step })}
              >
                {STEPS.map((step) => (
                  <option key={step}>{step}</option>
                ))}
              </SelectField>
              <SelectField
                aria-label={`${name} · ${t('score.accidental')}`}
                value={pitch.alter}
                onChange={(event) => onEdit(index, { ...pitch, alter: Number(event.target.value) })}
              >
                <option value={-2}>𝄫</option>
                <option value={-1}>♭</option>
                <option value={0}>♮</option>
                <option value={1}>♯</option>
                <option value={2}>𝄪</option>
              </SelectField>
              <NumberStepper
                label={`${name} · ${t('score.octave')}`}
                decreaseLabel={t('score.decreaseOctave', { note: name })}
                increaseLabel={t('score.increaseOctave', { note: name })}
                min={0}
                max={9}
                value={pitch.octave}
                onChange={(octave) => onEdit(index, { ...pitch, octave })}
              />
            </div>
          )
        })}
      </div>
      {selectedIndex !== null && (
        <div className={styles.actions}>
          <Button variant="ghost" onClick={onShowAll}>
            {t('score.showAllNotes')}
          </Button>
        </div>
      )}
    </>
  )
}

export function TranspositionControls({
  mode,
  intervalIndex,
  instrument,
  sourceInstrument,
  sourceDeclared,
  hasPreview,
  applying,
  onModeChange,
  onIntervalChange,
  onInstrumentChange,
  onSourceInstrumentChange,
  onPreview,
  onApply,
}: {
  mode: 'key' | 'instrument'
  intervalIndex: number
  instrument: Instrument
  sourceInstrument: Instrument | null
  sourceDeclared: boolean
  hasPreview: boolean
  applying: boolean
  onModeChange: (mode: 'key' | 'instrument') => void
  onIntervalChange: (index: number) => void
  onInstrumentChange: (instrument: Instrument) => void
  onSourceInstrumentChange: (instrument: Instrument) => void
  onPreview: () => void
  onApply: () => void
}) {
  const t = useT()
  return (
    <div className={styles.transposeControls}>
      <fieldset className={styles.modes} aria-label={t('score.transpose')}>
        <label className={styles.mode}>
          <input
            type="radio"
            name="score-transposition-mode"
            checked={mode === 'key'}
            onChange={() => onModeChange('key')}
          />
          <span>{t('score.changeKey')}</span>
        </label>
        <label className={styles.mode}>
          <input
            type="radio"
            name="score-transposition-mode"
            checked={mode === 'instrument'}
            onChange={() => onModeChange('instrument')}
          />
          <span>{t('score.adaptInstrument')}</span>
        </label>
      </fieldset>
      {mode === 'instrument' &&
        (sourceDeclared ? (
          <p className={styles.hint}>{t('score.sourceFromMusicXml')}</p>
        ) : (
          <div className={styles.transposeField}>
            <SelectField
              label={t('score.sourceInstrument')}
              value={sourceInstrument ?? ''}
              onChange={(event) => onSourceInstrumentChange(event.target.value as Instrument)}
            >
              <option value="" disabled>
                {t('score.chooseSourceInstrument')}
              </option>
              {Object.entries(INSTRUMENTS).map(([id, profile]) => (
                <option key={id} value={id}>
                  {profile.label}
                </option>
              ))}
            </SelectField>
          </div>
        ))}
      <div className={styles.transposeField}>
        {mode === 'key' ? (
          <SelectField
            label={t('score.interval')}
            value={intervalIndex}
            onChange={(event) => onIntervalChange(Number(event.target.value))}
          >
            {INTERVALS.map((interval, index) => (
              <option key={index} value={index}>
                {interval.label}
              </option>
            ))}
          </SelectField>
        ) : (
          <SelectField
            label={t('score.targetInstrument')}
            value={instrument}
            onChange={(event) => onInstrumentChange(event.target.value as Instrument)}
          >
            {Object.entries(INSTRUMENTS).map(([id, profile]) => (
              <option key={id} value={id}>
                {profile.label}
              </option>
            ))}
          </SelectField>
        )}
      </div>
      <div className={styles.actions}>
        <Button
          variant={hasPreview ? 'ghost' : 'primary'}
          onClick={onPreview}
          disabled={
            applying ||
            (mode === 'key' && intervalIndex === 0) ||
            (mode === 'instrument' && !sourceDeclared && sourceInstrument === null)
          }
        >
          {t('score.preview')}
        </Button>
        {hasPreview && (
          <Button onClick={onApply} disabled={applying}>
            {t('score.apply')}
          </Button>
        )}
      </div>
    </div>
  )
}
