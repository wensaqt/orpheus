import type { ReactNode } from 'react'

import { RETURN_TO_PARAM } from '@front/_lib/routes'

import styles from './AuthSheet.module.css'

type AuthSheetProps = {
  heading: string
  subtitle: string
  action: (form: FormData) => void
  returnTo: string
  // Message of the last failed attempt, announced to screen readers
  error: string | null
  errorId: string
  submitLabel: string
  pendingLabel: string
  pending: boolean
  children: ReactNode
}

/*
 * A small sheet of paper holding an auth form: a title at the top, the ruled fields, and the
 * button at the foot of the page.
 */
export function AuthSheet({
  heading,
  subtitle,
  action,
  returnTo,
  error,
  errorId,
  submitLabel,
  pendingLabel,
  pending,
  children,
}: AuthSheetProps) {
  return (
    <form action={action} className={styles.sheet}>
      <header>
        <h1 className={styles.heading}>{heading}</h1>
        <p className={styles.subtitle}>{subtitle}</p>
      </header>

      <div className={styles.fields}>{children}</div>

      <input type="hidden" name={RETURN_TO_PARAM} value={returnTo} />

      <div className={styles.footer}>
        {/* Always rendered, so screen readers announce the message when it appears */}
        <p id={errorId} role="alert" className={styles.error}>
          {error}
        </p>
        <button type="submit" className={styles.submit} disabled={pending}>
          {pending ? pendingLabel : submitLabel}
        </button>
      </div>
    </form>
  )
}
