import type { Instrument, Pitch, ScoreNote, Step } from '@/lib/scores'
import { INSTRUMENT_IDS, INTERVALS, STEPS } from '@/lib/scores'

import { useT } from '@front/_components/i18n/I18nProvider'
import { Button } from '@front/_components/ui/Button/Button'
import { NumberStepper } from '@front/_components/ui/NumberStepper/NumberStepper'
import { SelectField } from '@front/_components/ui/SelectField/SelectField'

import type { useScoreTransposition } from './useScoreTransposition'
import styles from './ScoreDocument.module.css'

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
        {visibleNotes.map((note) => (
          <PitchCorrectionRow
            key={note.index}
            note={note}
            selected={note.index === selectedIndex}
            onEdit={onEdit}
          />
        ))}
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

function PitchCorrectionRow({
  note: { index, measure, pitch },
  selected,
  onEdit,
}: {
  note: ScoreNote
  selected: boolean
  onEdit: (index: number, pitch: Pitch) => void
}) {
  const t = useT()
  const name = t('score.noteInMeasure', { index: index + 1, measure })
  return (
    <div className={styles.note} key={index} data-note-index={index} data-selected={selected}>
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
}

function InstrumentField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: Instrument | null
  onChange: (instrument: Instrument) => void
  placeholder?: string
}) {
  const t = useT()
  return (
    <SelectField
      label={label}
      value={value ?? ''}
      onChange={(event) => {
        const instrument = INSTRUMENT_IDS.find((id) => id === event.target.value)
        if (instrument) onChange(instrument)
      }}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {INSTRUMENT_IDS.map((id) => (
        <option key={id} value={id}>
          {t(`score.instruments.${id}`)}
        </option>
      ))}
    </SelectField>
  )
}

type Transposition = ReturnType<typeof useScoreTransposition>
type TranspositionControlsProps = {
  settings: Transposition['controls']['settings']
  actions: Transposition['controls']['actions']
  availability: {
    sourceDeclared: boolean
    hasPreview: boolean
    canApply: boolean
    applying: boolean
  }
}

export function TranspositionControls({
  settings,
  actions,
  availability,
}: TranspositionControlsProps) {
  const { mode, intervalIndex, instrument, sourceInstrument } = settings
  const { sourceDeclared, hasPreview, canApply, applying } = availability
  const {
    onModeChange,
    onIntervalChange,
    onInstrumentChange,
    onSourceInstrumentChange,
    onPreview,
    onApply,
  } = actions
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
            <InstrumentField
              label={t('score.sourceInstrument')}
              value={sourceInstrument}
              onChange={onSourceInstrumentChange}
              placeholder={t('score.chooseSourceInstrument')}
            />
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
                {t(`score.intervals.${interval.id}`)}
              </option>
            ))}
          </SelectField>
        ) : (
          <InstrumentField
            label={t('score.targetInstrument')}
            value={instrument}
            onChange={onInstrumentChange}
          />
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
          <Button onClick={onApply} disabled={applying || !canApply}>
            {t('score.apply')}
          </Button>
        )}
      </div>
    </div>
  )
}
