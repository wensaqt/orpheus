'use client'

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

import { useT } from '@front/_components/i18n/I18nProvider'

import { Toast } from './Toast'
import styles from './ToastProvider.module.css'
import { type ToastApi, type ToastMessage, ToastTone } from './types'

const ToastContext = createContext<ToastApi | null>(null)

// Notifications stacked at the bottom of the screen, announced to screen readers
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const t = useT()
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const nextId = useRef(0)

  // Stable, so a toast's timer doesn't restart whenever the list changes
  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  // Stable, so the whole app doesn't re-render when a toast shows
  const api = useMemo<ToastApi>(() => {
    const show: ToastApi['show'] = (message, options = {}) => {
      const id = nextId.current++
      setToasts((current) => [...current, { id, message, ...options }])
    }
    return {
      show,
      success: (message, options) => show(message, { ...options, tone: ToastTone.Success }),
      error: (message, options) => show(message, { ...options, tone: ToastTone.Error }),
    }
  }, [])

  return (
    <ToastContext value={api}>
      {children}
      <section className={styles.region} aria-label={t('common.notifications')} aria-live="polite">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </section>
    </ToastContext>
  )
}

export function useToast() {
  const api = useContext(ToastContext)
  if (!api) throw new Error('useToast must be used inside <ToastProvider>')
  return api
}
