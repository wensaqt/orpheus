'use client'

import React, { createContext, useCallback, useContext, useId, useRef, useState } from 'react'

import { t } from '../../../_lib/i18n'
import { Dialog } from '../Dialog/Dialog'
import styles from './ConfirmProvider.module.css'

export type ConfirmOptions = {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'default' | 'danger'
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<Confirm | null>(null)

/*
 * Une seule fenêtre de confirmation pour toute l'application. confirm() l'ouvre et renvoie une
 * promesse résolue à true (confirmé) ou false (annulé, Échap, clic sur le fond).
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  // Gardées après la fermeture pour que le contenu ne disparaisse pas pendant l'animation
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((confirmed: boolean) => void) | null>(null)
  const titleId = useId()

  const confirm = useCallback<Confirm>((next) => {
    // Une nouvelle demande annule la précédente
    resolver.current?.(false)
    setOptions(next)
    setOpen(true)
    return new Promise((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const settle = (confirmed: boolean) => {
    resolver.current?.(confirmed)
    resolver.current = null
    setOpen(false)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={open} onClose={() => settle(false)} labelledBy={titleId}>
        {options && (
          <>
            <h2 id={titleId} className={styles.title}>
              {options.title}
            </h2>
            {options.description && <p className={styles.description}>{options.description}</p>}
            <div className={styles.actions}>
              <button type="button" className={styles.cancel} onClick={() => settle(false)}>
                {options.cancelLabel ?? t('common.cancel')}
              </button>
              <button
                type="button"
                className={styles.confirm}
                data-tone={options.tone ?? 'default'}
                // Action confirmée par défaut au clavier, comme les boîtes de dialogue natives
                autoFocus
                onClick={() => settle(true)}
              >
                {options.confirmLabel ?? t('common.confirm')}
              </button>
            </div>
          </>
        )}
      </Dialog>
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext)
  if (!confirm) throw new Error('useConfirm must be used inside <ConfirmProvider>')
  return confirm
}
