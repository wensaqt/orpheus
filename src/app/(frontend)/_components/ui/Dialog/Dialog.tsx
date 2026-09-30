'use client'

import React, { useEffect, useRef } from 'react'

import styles from './Dialog.module.css'

type DialogProps = {
  open: boolean
  onClose: () => void
  // id of the dialog title, for screen readers
  labelledBy: string
  children: React.ReactNode
}

/*
 * Modal built on the native <dialog> element: the browser handles the focus trap, closing on
 * Escape and the backdrop. Clicking the backdrop also closes the dialog.
 */
export function Dialog({ open, onClose, labelledBy, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={labelledBy}
      onClose={onClose}
      // The content fills the dialog: only a backdrop click reaches the <dialog> itself
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={styles.content}>{children}</div>
    </dialog>
  )
}
