import { type ComponentProps, useId } from 'react'

import styles from './AuthField.module.css'

type AuthFieldProps = Omit<ComponentProps<'input'>, 'className'> & {
  label: string
  hint?: string
  // Points the field at the form's error message
  errorId?: string
}

// One ruled line of the sheet: label above, an optional hint below
export function AuthField({ label, hint, errorId, ...input }: AuthFieldProps) {
  const hintId = useId()
  const describedBy = [hint && hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={styles.field}>
      <label className={styles.line}>
        <span className={styles.label}>{label}</span>
        <input
          {...input}
          className={styles.input}
          aria-invalid={errorId ? true : undefined}
          aria-describedby={describedBy}
        />
      </label>
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
    </div>
  )
}
