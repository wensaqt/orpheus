'use client'

import React, { createContext, useCallback, useContext, useId, useRef, useState } from 'react'

import { useT } from '@front/_components/i18n/I18nProvider'
import { Dialog } from '@front/_components/ui/Dialog/Dialog'
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
 * A single confirmation dialog for the whole app. confirm() opens it and returns a promise
 * resolved to true (confirmed) or false (cancelled, Escape, backdrop click).
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  // Kept after closing so the content doesn't vanish during the animation
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((confirmed: boolean) => void) | null>(null)
  const titleId = useId()

  const confirm = useCallback<Confirm>((next) => {
    // A new request cancels the previous one
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
                // Confirm is the default keyboard action, like native dialogs
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
