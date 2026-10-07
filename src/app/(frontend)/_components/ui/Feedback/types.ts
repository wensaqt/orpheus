export enum ToastTone {
  Default = 'default',
  Success = 'success',
  Error = 'error',
}

export type ToastOptions = {
  tone?: ToastTone
  // Action button in the toast, e.g. "Undo"
  action?: { label: string; onClick: () => void }
}

export type ToastMessage = ToastOptions & { id: number; message: string }

export type ToastApi = {
  show: (message: string, options?: ToastOptions) => void
  success: (message: string, options?: Omit<ToastOptions, 'tone'>) => void
  error: (message: string, options?: Omit<ToastOptions, 'tone'>) => void
}
