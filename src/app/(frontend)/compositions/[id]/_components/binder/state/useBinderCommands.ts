'use client'

import { startTransition, useMemo } from 'react'

import { type BinderItemKind, MAX_BINDER_TITLE_LENGTH } from '@/lib/binder/constants'
import { type BinderMove, descendantIds, firstDocument } from '@/lib/binder/tree'
import { cleanTitle } from '@/lib/titles'
import type { Id } from '@/lib/ids'

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
import type { Translate } from '@front/_lib/i18n'
import { forgetDocuments, rememberDocument } from '@front/_features/binder/documentStore'

import { applyBinderOp, type BinderOp } from './binderOps'
import type { NavigateDocument } from './useOpenDocument'

export type BinderCommands = ReturnType<typeof useBinderCommands>

type BinderCommandsOptions = {
  compositionId: Id
  entries: BinderEntry[]
  activeDocumentId: Id | null
  // Keeps a change for good / shows it while it is being saved
  apply: (op: BinderOp) => void
  showOp: (op: BinderOp) => void
  navigate: NavigateDocument
  cancelDocuments: (ids: Iterable<Id>) => void
  startRename: (id: Id) => void
}

// What deleting an item takes with it: the document, or the folder and how much is inside
function deleteWarning(t: Translate, entry: BinderEntry, insideCount: number) {
  if (entry.kind === 'document') return t('binder.delete.document')
  if (insideCount === 0) return t('binder.delete.folderEmpty')
  if (insideCount === 1) return t('binder.delete.folderOne')
  return t('binder.delete.folderMany', { count: insideCount })
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
  navigate,
  cancelDocuments,
  startRename,
}: BinderCommandsOptions) {
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

    return {
      open: (id: Id) => (id === activeDocumentId ? Promise.resolve(true) : navigate(id)),

      // A new folder is named straight away; a new document opens
      async create(kind: BinderItemKind, parent: Id | null) {
        const result = await createBinderItem(compositionId, kind, parent).catch(() => null)
        if (result?.status !== 'done') {
          toast.error(t('binder.error'))
          return null
        }
        const { updatedAt, ...entry } = result.data
        apply({ type: 'add', entry })
        if (kind === 'folder') startRename(entry.id)
        else {
          // Known to be empty: it opens without asking the server
          rememberDocument(entry.id, { content: null, updatedAt })
          await navigate(entry.id)
        }
        return entry
      },

      // From the tree's rename field
      rename(id: Id, title: string) {
        const cleaned = cleanTitle(title, MAX_BINDER_TITLE_LENGTH)
        if (!cleaned) return Promise.resolve(false)
        return run({ type: 'rename', id, title: cleaned }, () => renameBinderItem(id, cleaned))
      },

      // From a title field that saves on its own: the binder only shows the new title
      setTitle: (id: Id, title: string) => apply({ type: 'rename', id, title }),

      async remove(entry: BinderEntry) {
        const inside = descendantIds(entries, entry.id)
        const confirmed = await confirm({
          title: t('binder.delete.title', { title: entry.title }),
          description: deleteWarning(t, entry, inside.length),
          confirmLabel: t('binder.delete.confirm'),
          tone: 'danger',
        })
        if (!confirmed) return

        const op: BinderOp = { type: 'remove', id: entry.id }
        if (!(await run(op, () => deleteBinderItem(entry.id)))) return
        const removed = [entry.id, ...inside]
        // Their pending changes would be saved to documents that no longer exist
        cancelDocuments(removed)
        forgetDocuments(removed)
        toast.success(t('binder.delete.done', { title: entry.title }))
        if (activeDocumentId !== null && removed.includes(activeDocumentId)) {
          await navigate(firstDocument(applyBinderOp(entries, op))?.id ?? null, 'replace')
        }
      },

      move: (id: Id, move: BinderMove) =>
        run({ type: 'move', id, move }, () => moveBinderItem(id, move)),
    }
  }, [
    compositionId,
    entries,
    activeDocumentId,
    apply,
    showOp,
    navigate,
    cancelDocuments,
    startRename,
    t,
    toast,
    confirm,
  ])
}
