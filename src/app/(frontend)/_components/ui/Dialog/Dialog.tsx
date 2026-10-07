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

  // The content fills the dialog: only a backdrop click reaches the <dialog> itself
  function handleClick(event: React.MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) onClose()
  }

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onClick={handleClick}
    >
      <div className={styles.content}>{children}</div>
    </dialog>
  )
}

// The dialog's heading, labelling it through the id given to <Dialog labelledBy>
export function DialogTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className={styles.title}>
      {children}
    </h2>
  )
}

// The row of buttons at the foot of a dialog, the main action last
export function DialogActions({ children }: { children: React.ReactNode }) {
  return <div className={styles.actions}>{children}</div>
}
