'use client'

import React from 'react'

import { ConfirmProvider } from './ConfirmProvider'
import { ToastProvider } from './ToastProvider'

// Confirmations et notifications, disponibles partout via useConfirm() et useToast()
export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmProvider>{children}</ConfirmProvider>
    </ToastProvider>
  )
}
