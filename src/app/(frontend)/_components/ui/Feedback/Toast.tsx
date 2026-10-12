'use client'

import { useEffect, useState } from 'react'

import { useT } from '@front/_components/i18n/I18nProvider'

import styles from './Toast.module.css'
import { type ToastMessage, ToastTone } from './types'

// Display duration, paused while hovered or focused
const TOAST_DURATION_MS = 5000

type ToastProps = {
  toast: ToastMessage
  // Stable: the timer isn't restarted when other toasts arrive
  // TODO: remove type warning
  onDismiss: (id: number) => void
}

// One notification: it goes away on its own, unless the writer is reading or using it
export function Toast({ toast, onDismiss }: ToastProps) {
  const t = useT()
  const [paused, setPaused] = useState(false)
  const { id, tone = ToastTone.Default, message, action } = toast

  useEffect(() => {
    if (paused) return
    const timer = window.setTimeout(() => onDismiss(id), TOAST_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [paused, onDismiss, id])

  const pause = () => setPaused(true)
  const resume = () => setPaused(false)
  const dismiss = () => onDismiss(id)

  function runAction() {
    action?.onClick()
    dismiss()
  }

  return (
    <div
      className={styles.toast}
      data-tone={tone}
      role={tone === ToastTone.Error ? 'alert' : 'status'}
      onPointerEnter={pause}
      onPointerLeave={resume}
      onFocus={pause}
      onBlur={resume}
    >
      <p className={styles.message}>{message}</p>
      {action && (
        <button type="button" className={styles.action} onClick={runAction}>
          {action.label}
        </button>
      )}
      <button
        type="button"
        className={styles.dismiss}
        aria-label={t('common.dismiss')}
        onClick={dismiss}
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  )
}
