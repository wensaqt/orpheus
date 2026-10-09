import type { ComponentProps } from 'react'

import { classNames } from '@front/_lib/classNames'

import styles from './SelectField.module.css'

type SelectFieldProps = ComponentProps<'select'> & { label?: string }

export function SelectField({ label, className, id, ...select }: SelectFieldProps) {
  const control = (
    <span className={styles.control}>
      <select id={id} className={classNames(styles.select, className)} {...select} />
      <span className={styles.chevron} aria-hidden="true" />
    </span>
  )

  return label ? (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      {control}
    </label>
  ) : (
    control
  )
}
