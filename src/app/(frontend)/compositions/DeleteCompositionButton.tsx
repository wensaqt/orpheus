'use client'

import React, { useTransition } from 'react'

import { deleteComposition } from './actions'
import styles from './page.module.css'

const COPY = {
  label: 'Delete',
  pending: 'Deleting…',
  confirm: (title: string) => `Delete “${title}”? This cannot be undone.`,
  error: 'Could not delete this composition.',
}

type DeleteCompositionButtonProps = {
  id: number
  title: string
}

export function DeleteCompositionButton({ id, title }: DeleteCompositionButtonProps) {
  const [pending, startTransition] = useTransition()

  return (
    <button
      type="button"
      className={styles.delete}
      disabled={pending}
      aria-label={`${COPY.label} ${title}`}
      onClick={() => {
        if (!window.confirm(COPY.confirm(title))) return
        startTransition(async () => {
          try {
            await deleteComposition(id)
          } catch {
            window.alert(COPY.error)
          }
        })
      }}
    >
      {pending ? COPY.pending : COPY.label}
    </button>
  )
}
