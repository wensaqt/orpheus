'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { useT } from '@front/_components/i18n/I18nProvider'
import styles from './ToastProvider.module.css'

type ToastTone = 'default' | 'success' | 'error'

type ToastOptions = {
  tone?: ToastTone
  // Action button in the toast, e.g. "Undo"
  action?: { label: string; onClick: () => void }
}

type Toast = ToastOptions & { id: number; message: string }

type ToastApi = {
  show: (message: string, options?: ToastOptions) => void
  success: (message: string, options?: Omit<ToastOptions, 'tone'>) => void
  error: (message: string, options?: Omit<ToastOptions, 'tone'>) => void
}

// Display duration, paused while the toast is hovered or focused
const TOAST_DURATION = 5000

const ToastContext = createContext<ToastApi | null>(null)

// Notifications stacked at the bottom of the screen, announced to screen readers
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const t = useT()
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const api = useMemo<ToastApi>(() => {
    const show: ToastApi['show'] = (message, options = {}) => {
      const id = nextId.current++
      setToasts((current) => [...current, { id, message, ...options }])
    }
    return {
      show,
      success: (message, options) => show(message, { ...options, tone: 'success' }),
      error: (message, options) => show(message, { ...options, tone: 'error' }),
    }
  }, [])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <section className={styles.region} aria-label={t('common.notifications')} aria-live="polite">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </section>
    </ToastContext.Provider>
  )
}

// onDismiss is stable: the timer isn't restarted when other toasts arrive
function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const t = useT()
  const [paused, setPaused] = useState(false)
  const { id } = toast

  useEffect(() => {
    if (paused) return
    const timer = window.setTimeout(() => onDismiss(id), TOAST_DURATION)
    return () => window.clearTimeout(timer)
  }, [paused, onDismiss, id])

  return (
    <div
      className={styles.toast}
      data-tone={toast.tone ?? 'default'}
      role={toast.tone === 'error' ? 'alert' : 'status'}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <p className={styles.message}>{toast.message}</p>
      {toast.action && (
        <button
          type="button"
          className={styles.action}
          onClick={() => {
            toast.action?.onClick()
            onDismiss(id)
          }}
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        className={styles.dismiss}
        aria-label={t('common.dismiss')}
        onClick={() => onDismiss(id)}
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  )
}

export function useToast() {
  const api = useContext(ToastContext)
  if (!api) throw new Error('useToast must be used inside <ToastProvider>')
  return api
}
