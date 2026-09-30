'use client'

import React, { useEffect, useRef } from 'react'

import styles from './Dialog.module.css'

type DialogProps = {
  open: boolean
  onClose: () => void
  // id du titre de la fenêtre, pour les lecteurs d'écran
  labelledBy: string
  children: React.ReactNode
}

/*
 * Fenêtre modale sur l'élément natif <dialog> : le navigateur gère le focus piégé, la fermeture
 * par Échap et le fond. Un clic sur le fond ferme aussi la fenêtre.
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
      // Le contenu remplit la fenêtre : seul un clic sur le fond atteint le <dialog> lui-même
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={styles.content}>{children}</div>
    </dialog>
  )
}
