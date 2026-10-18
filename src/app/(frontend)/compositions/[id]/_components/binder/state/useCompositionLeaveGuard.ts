import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import type { Id } from '@/lib/ids'
import { useT } from '@front/_components/i18n/I18nProvider'
import { useToast } from '@front/_components/ui/Feedback/ToastProvider'
import { registerPendingChanges } from '@front/_lib/pendingChanges'
import { editorPath } from '@front/_lib/routes'

function isUnmodifiedClick(event: MouseEvent): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
}

function canIntercept(link: HTMLAnchorElement): boolean {
  // Reconnection deliberately leaves the editor with its draft, even when saving is blocked.
  return !link.target && !link.hasAttribute('download') && link.dataset.reconnect === undefined
}

function navigationLink(event: MouseEvent): HTMLAnchorElement | null {
  if (!isUnmodifiedClick(event)) return null
  const link = event.target instanceof Element ? event.target.closest('a[href]') : null
  return link instanceof HTMLAnchorElement && canIntercept(link) ? link : null
}

function isInternalCompositionExit(destination: URL, compositionId: Id): boolean {
  return (
    destination.origin === window.location.origin &&
    destination.pathname !== window.location.pathname &&
    editorPath(destination.pathname)?.compositionId !== compositionId
  )
}

function compositionExit(event: MouseEvent, compositionId: Id): URL | null {
  const link = navigationLink(event)
  if (!link) return null
  const destination = new URL(link.href)
  return isInternalCompositionExit(destination, compositionId) ? destination : null
}

// Global account actions and links leaving the composition share the mounted editor's saver.
export function useCompositionLeaveGuard(compositionId: Id, flush: () => Promise<boolean>) {
  const router = useRouter()
  const t = useT()
  const toast = useToast()

  useEffect(() => {
    async function saveBeforeLeaving(destination: URL) {
      if (await flush()) router.push(destination.pathname + destination.search + destination.hash)
      else toast.error(t('binder.saveFirst'))
    }
    const leave = (event: MouseEvent) => {
      const destination = compositionExit(event, compositionId)
      if (!destination) return
      event.preventDefault()
      event.stopPropagation()
      void saveBeforeLeaving(destination)
    }
    const unregister = registerPendingChanges(flush)
    document.addEventListener('click', leave, true)
    return () => {
      unregister()
      document.removeEventListener('click', leave, true)
    }
  }, [compositionId, flush, router, t, toast])
}
