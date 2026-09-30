'use client'

import React from 'react'

import { ConfirmProvider } from './ConfirmProvider'
import { ToastProvider } from './ToastProvider'

// Confirmations and notifications, available everywhere via useConfirm() and useToast()
export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmProvider>{children}</ConfirmProvider>
    </ToastProvider>
  )
}
