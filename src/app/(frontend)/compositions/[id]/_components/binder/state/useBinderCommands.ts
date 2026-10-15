'use client'

import { startTransition, useMemo, useRef } from 'react'

import { type BinderItemKind, MAX_BINDER_TITLE_LENGTH } from '@/lib/binder/constants'
import {
  type BinderMove,
  descendantIds,
  firstDocument,
  siblingsOf,
  toBinderNode,
} from '@/lib/binder/tree'
import { cleanTitle } from '@/lib/titles'
import type { Id } from '@/lib/ids'
import type { ScoreVariant } from '@/lib/scores/variantTitle'

import { useT } from '@front/_components/i18n/I18nProvider'
import { useConfirm } from '@front/_components/ui/Feedback/ConfirmProvider'
import { useToast } from '@front/_components/ui/Feedback/ToastProvider'
import {
  createBinderItem,
  createTransposedScore,
  deleteBinderItem,
  moveBinderItem,
  renameBinderItem,
} from '@front/_features/binder/actions'
import type { BinderEntry } from '@front/_features/binder/types'
import { type ActionResult, succeeded } from '@front/_lib/actionResult'
import type { Translate } from '@front/_lib/i18n'
import {
  forgetDocuments,
  rememberDocument,
  rememberScore,
} from '@front/_features/binder/documentStore'

import { useEditorHistory } from '../../history/HistoryProvider'
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
  const renameGroups = useRef(
    new WeakMap<object, { before: string; after: string; generation: number }>(),
  )
  const history = useEditorHistory()
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
          else if (!history.getSnapshot().busy) toast.error(t('binder.error'))
          resolve(accepted)
        })
      })

    const recordRename = (id: Id, before: string, after: string, group?: object) => {
      if (before === after) return
      const previous = group && renameGroups.current.get(group)
      const generation = history.getSnapshot().generation
      const change =
        previous && previous.generation === generation && history.canMerge(previous)
          ? previous
          : { before, after, generation }
      change.after = after
      if (group) renameGroups.current.set(group, change)
      const restore = (expected: string, title: string) =>
        run({ type: 'rename', id, title }, () => renameBinderItem(id, title, expected))
      history.record(
        {
          scope: { kind: 'binder', ids: [id], operation: 'rename' },
          isEmpty: () => change.before === change.after,
          undo: () => restore(change.after, change.before),
          redo: () => restore(change.before, change.after),
        },
        group ? change : undefined,
      )
    }
    const perform = (action: () => Promise<boolean>) =>
      history.perform(action, () => toast.error(t('binder.error')))
    return {
      open: (id: Id) =>
        history.getSnapshot().busy
          ? Promise.resolve(false)
          : id === activeDocumentId
            ? Promise.resolve(true)
            : navigate(id),

      // A new folder is named straight away; a new document opens
      async create(
        kind: BinderItemKind,
        parent: Id | null,
        documentType: 'text' | 'score' = 'text',
      ) {
        const createdItem: { entry: BinderEntry | null } = { entry: null }
        const accepted = await perform(async () => {
          const result = await createBinderItem(compositionId, kind, parent, documentType)
          if (result.status !== 'done') return false
          const { updatedAt, ...created } = result.data
          history.discard((scope) => scope.kind === 'binder' && scope.operation === 'move')
          apply({ type: 'add', entry: created })
          if (kind === 'document' && documentType === 'text')
            rememberDocument(created.id, { content: null, updatedAt })
          createdItem.entry = created
          return true
        })
        const entry = createdItem.entry
        if (!accepted || !entry) return null
        if (kind === 'folder') startRename(entry.id)
        else {
          // Known to be empty: it opens without asking the server
          await navigate(entry.id)
        }
        return entry
      },

      async createScoreTransposition(sourceId: Id, xml: string, variant: ScoreVariant) {
        const createdItem: { entry: BinderEntry | null } = { entry: null }
        const accepted = await perform(async () => {
          const result = await createTransposedScore({ sourceId, scoreXml: xml, variant })
          if (result.status !== 'done') return false
          const created = result.data
          history.discard((scope) => scope.kind === 'binder' && scope.operation === 'move')
          apply({ type: 'add', entry: created })
          rememberScore(created.id, { scoreXml: xml, updatedAt: created.updatedAt })
          createdItem.entry = created
          return true
        })
        if (!accepted || !createdItem.entry) return null
        await navigate(createdItem.entry.id)
        return createdItem.entry
      },

      // From the tree's rename field
      rename(id: Id, title: string) {
        const cleaned = cleanTitle(title, MAX_BINDER_TITLE_LENGTH)
        const before = entries.find((entry) => entry.id === id)?.title
        if (!cleaned || before === undefined) return Promise.resolve(false)
        if (cleaned === before) return Promise.resolve(true)
        return perform(async () => {
          if (
            !(await run({ type: 'rename', id, title: cleaned }, () =>
              renameBinderItem(id, cleaned, before),
            ))
          )
            return false
          recordRename(id, before, cleaned)
          return true
        })
      },

      // A focused header title is one rename, recorded as it changes and saved by its field.
      setTitle(id: Id, title: string, before: string, group: object) {
        apply({ type: 'rename', id, title })
        recordRename(id, before, title, group)
      },

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
        if (!(await perform(() => run(op, () => deleteBinderItem(entry.id))))) return
        const removed = [entry.id, ...inside]
        // Their pending changes would be saved to documents that no longer exist
        history.discard((scope) =>
          scope.kind === 'binder'
            ? scope.operation === 'move' || scope.ids.some((id) => removed.includes(id))
            : scope.kind === 'text' && removed.includes(scope.id),
        )
        cancelDocuments(removed)
        forgetDocuments(removed)
        toast.success(t('binder.delete.done', { title: entry.title }))
        if (activeDocumentId !== null && removed.includes(activeDocumentId)) {
          await navigate(firstDocument(applyBinderOp(entries, op))?.id ?? null, 'replace')
        }
      },

      move(id: Id, move: BinderMove) {
        const item = entries.find((entry) => entry.id === id)
        if (!item) return Promise.resolve(false)
        const inverse = {
          parent: item.parent,
          index: siblingsOf(entries, item.parent).findIndex((entry) => entry.id === id),
        }
        const forward: BinderOp = { type: 'move', id, move }
        const backward: BinderOp = { type: 'move', id, move: inverse }
        const after = applyBinderOp(entries, forward)
        if (after === entries) return Promise.resolve(true)
        const reverted = applyBinderOp(after, backward)
        return perform(async () => {
          if (!(await run(forward, () => moveBinderItem(id, move, entries.map(toBinderNode)))))
            return false
          history.record({
            scope: { kind: 'binder', ids: [id], operation: 'move' },
            undo: () => run(backward, () => moveBinderItem(id, inverse, after.map(toBinderNode))),
            redo: () => run(forward, () => moveBinderItem(id, move, reverted.map(toBinderNode))),
          })
          return true
        })
      },
    }
  }, [
    history,
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
