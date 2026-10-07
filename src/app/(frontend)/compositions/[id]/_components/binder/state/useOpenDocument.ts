'use client'

import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useEffectEvent, useState } from 'react'

import type { Id } from '@/lib/ids'

import { useT } from '@front/_components/i18n/I18nProvider'
import { useToast } from '@front/_components/ui/Feedback/ToastProvider'
import { documentIdFromPath, ROUTES } from '@front/_lib/routes'

/*
 * The document shown in the editor. Documents are switched on the client (history.pushState),
 * which only the pathname follows (useParams keeps the page first rendered by the server), so
 * the URL is the request. The browser's back and forward buttons change it before anything can
 * be saved: the switch then waits until everything open is saved, and if that fails the URL
 * goes back to the document still shown.
 */
export function useOpenDocument(compositionId: Id, flushAll: () => Promise<boolean>) {
  const t = useT()
  const toast = useToast()
  const requested = documentIdFromPath(usePathname(), compositionId)
  const [openId, setOpenId] = useState(requested)

  const refuse = useEffectEvent((shown: Id | null) => {
    toast.error(t('binder.saveFirst'))
    window.history.pushState(null, '', ROUTES.editor(compositionId, shown))
  })

  useEffect(() => {
    if (requested === openId) return
    // Several back presses in a row: only the last one counts
    let current = true
    void flushAll().then((saved) => {
      if (!current) return
      if (saved) setOpenId(requested)
      else refuse(openId)
    })
    return () => {
      current = false
    }
  }, [requested, openId, flushAll])

  // Programmatic navigation commits the URL and shown document together, after one save.
  const navigate = useCallback(
    async (documentId: Id | null, mode: 'push' | 'replace' = 'push') => {
      if (!(await flushAll())) {
        toast.error(t('binder.saveFirst'))
        return false
      }
      const path = ROUTES.editor(compositionId, documentId)
      if (mode === 'push') window.history.pushState(null, '', path)
      else window.history.replaceState(null, '', path)
      setOpenId(documentId)
      return true
    },
    [compositionId, flushAll, t, toast],
  )

  return { activeDocumentId: openId, navigate }
}

export type NavigateDocument = ReturnType<typeof useOpenDocument>['navigate']
