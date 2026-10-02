'use client'

import { useRouter } from 'next/navigation'
import { startTransition, useMemo } from 'react'

import { type BinderItemKind, MAX_BINDER_TITLE_LENGTH } from '@/lib/binder/constants'
import { type BinderMove, descendantIds, firstDocument } from '@/lib/binder/tree'
import { cleanTitle } from '@/lib/titles'

import { useT } from '@front/_components/i18n/I18nProvider'
import { useConfirm } from '@front/_components/ui/Feedback/ConfirmProvider'
import { useToast } from '@front/_components/ui/Feedback/ToastProvider'
import {
  createBinderItem,
  deleteBinderItem,
  moveBinderItem,
  renameBinderItem,
} from '@front/_features/binder/actions'
import type { BinderEntry } from '@front/_features/binder/types'
import { type ActionResult, succeeded } from '@front/_lib/actionResult'
import { ROUTES } from '@front/_lib/routes'

import { applyBinderOp, type BinderOp } from './binderOps'
import { forgetDrafts } from './documentDrafts'

export type BinderCommands = ReturnType<typeof useBinderCommands>

type BinderCommandsOptions = {
  compositionId: number
  entries: BinderEntry[]
  activeDocumentId: number | null
  // Keeps a change for good / shows it while it is being saved
  apply: (op: BinderOp) => void
  showOp: (op: BinderOp) => void
  flushAll: () => Promise<boolean>
  cancelDocuments: (ids: Iterable<number>) => void
  startRename: (id: number) => void
}

/*
 * What the writer can do to the binder. A change shows at once and is kept once the server
 * accepts it; if refused, it alone disappears and a toast says so. Leaving a document first
 * waits for its changes to be saved, and stays if they cannot be.
 */
export function useBinderCommands({
  compositionId,
  entries,
  activeDocumentId,
  apply,
  showOp,
  flushAll,
  cancelDocuments,
  startRename,
}: BinderCommandsOptions) {
  const router = useRouter()
  const t = useT()
  const toast = useToast()
  const confirm = useConfirm()

  return useMemo(() => {
    const run = (op: BinderOp, call: () => Promise<ActionResult<unknown>>) =>
      new Promise<boolean>((resolve) => {
        startTransition(async () => {
          showOp(op)
          const accepted = await succeeded(call())
          if (accepted) apply(op)
          else toast.error(t('binder.error'))
          resolve(accepted)
        })
      })

    // Goes to a document (or the empty binder) once everything open is saved
    const navigate = async (documentId: number | null, mode: 'push' | 'replace' = 'push') => {
      if (!(await flushAll())) {
        toast.error(t('binder.saveFirst'))
        return false
      }
      const path =
        documentId === null
          ? ROUTES.composition(compositionId)
          : ROUTES.document(compositionId, documentId)
      router[mode](path)
      return true
    }

    return {
      open: (id: number) => (id === activeDocumentId ? Promise.resolve(true) : navigate(id)),

      // A new folder is named straight away; a new document opens
      async create(kind: BinderItemKind, parent: number | null) {
        const result = await createBinderItem(compositionId, kind, parent).catch(() => null)
        if (result?.status !== 'done') {
          toast.error(t('binder.error'))
          return null
        }
        apply({ type: 'add', entry: result.data })
        if (kind === 'folder') startRename(result.data.id)
        else await navigate(result.data.id)
        return result.data
      },

      // From the tree's rename field
      rename(id: number, title: string) {
        const cleaned = cleanTitle(title, MAX_BINDER_TITLE_LENGTH)
        if (!cleaned) return Promise.resolve(false)
        return run({ type: 'rename', id, title: cleaned }, () => renameBinderItem(id, cleaned))
      },

      // From a title field that saves on its own: the binder only shows the new title
      setTitle: (id: number, title: string) => apply({ type: 'rename', id, title }),

      async remove(entry: BinderEntry) {
        const inside = descendantIds(entries, entry.id)
        const confirmed = await confirm({
          title: t('binder.delete.title', { title: entry.title }),
          description:
            entry.kind === 'document'
              ? t('binder.delete.document')
              : inside.length === 0
                ? t('binder.delete.folderEmpty')
                : inside.length === 1
                  ? t('binder.delete.folderOne')
                  : t('binder.delete.folderMany', { count: inside.length }),
          confirmLabel: t('binder.delete.confirm'),
          tone: 'danger',
        })
        if (!confirmed) return

        const op: BinderOp = { type: 'remove', id: entry.id }
        if (!(await run(op, () => deleteBinderItem(entry.id)))) return
        const removed = [entry.id, ...inside]
        // Their pending changes would be saved to documents that no longer exist
        cancelDocuments(removed)
        forgetDrafts(removed)
        toast.success(t('binder.delete.done', { title: entry.title }))
        if (activeDocumentId !== null && removed.includes(activeDocumentId)) {
          await navigate(firstDocument(applyBinderOp(entries, op))?.id ?? null, 'replace')
        }
      },

      move: (id: number, move: BinderMove) =>
        run({ type: 'move', id, move }, () => moveBinderItem(id, move)),
    }
  }, [
    compositionId,
    entries,
    activeDocumentId,
    apply,
    showOp,
    flushAll,
    cancelDocuments,
    startRename,
    router,
    t,
    toast,
    confirm,
  ])
}
