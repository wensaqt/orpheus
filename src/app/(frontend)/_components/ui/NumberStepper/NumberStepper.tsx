import styles from './NumberStepper.module.css'

type NumberStepperProps = {
  value: number
  min: number
  max: number
  label: string
  decreaseLabel: string
  increaseLabel: string
  onChange: (value: number) => void
}

export function NumberStepper({
  value,
  min,
  max,
  label,
  decreaseLabel,
  increaseLabel,
  onChange,
}: NumberStepperProps) {
  return (
    <div className={styles.stepper}>
      <button
        type="button"
        className={styles.button}
        aria-label={decreaseLabel}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
      >
        −
      </button>
      <input
        className={styles.input}
        type="number"
        min={min}
        max={max}
        aria-label={label}
        value={value}
        onChange={(event) => {
          const next = event.currentTarget.valueAsNumber
          if (Number.isInteger(next) && next >= min && next <= max) onChange(next)
        }}
      />
      <button
        type="button"
        className={styles.button}
        aria-label={increaseLabel}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  )
}
