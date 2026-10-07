import { type BinderMove, buildTree, type BinderTreeNode, siblingsOf } from '@/lib/binder/tree'
import type { Id } from '@/lib/ids'

import type { BinderEntry } from '@front/_features/binder/types'

import { DROP } from './constants'
import type { BinderRow, DropOperation } from './types'

/*
 * The lines shown, in reading order: the contents of a collapsed folder are hidden. A folder
 * counts as expanded unless the writer collapsed it.
 */
export function visibleRows(entries: BinderEntry[], collapsed: ReadonlySet<Id>): BinderRow[] {
  const rows: BinderRow[] = []
  const visit = (nodes: BinderTreeNode<BinderEntry>[], level: number) => {
    nodes.forEach(({ children, ...entry }, index) => {
      const expanded = entry.kind === 'folder' && !collapsed.has(entry.id)
      rows.push({
        entry,
        level,
        setSize: nodes.length,
        posInSet: index + 1,
        hasChildren: children.length > 0,
        expanded,
      })
      if (expanded) visit(children, level + 1)
    })
  }
  visit(buildTree(entries), 1)
  return rows
}

// Folders the item could be moved into: every folder but the item itself and its contents
export function moveDestinations(entries: BinderEntry[], excluded: ReadonlySet<Id>) {
  return visibleRows(entries, new Set()).filter(
    (row) => row.entry.kind === 'folder' && !excluded.has(row.entry.id),
  )
}

// Index meaning "after everything already there"
const AT_THE_END = Number.MAX_SAFE_INTEGER

/*
 * Where an item dropped on another one goes: just before or after it, among its siblings, or at
 * the end of it when it is a folder.
 */
export function dropDestination(
  entries: BinderEntry[],
  draggedId: Id,
  targetId: Id,
  operation: DropOperation,
): BinderMove | null {
  const target = entries.find((entry) => entry.id === targetId)
  if (!target) return null
  if (operation === DROP.inside) return { parent: target.id, index: AT_THE_END }
  const index = siblingsOf(entries, target.parent, draggedId).findIndex(
    (entry) => entry.id === targetId,
  )
  return { parent: target.parent, index: operation === DROP.before ? index : index + 1 }
}

// Moving into a folder, from the "Move to…" dialog, puts the item last
export const intoFolder = (parent: Id | null): BinderMove => ({ parent, index: AT_THE_END })

// One step up or down among its siblings, if there is room (Alt+arrows, "Move up/down")
export function reorderDestination(row: BinderRow, step: -1 | 1): BinderMove | null {
  const index = row.posInSet - 1 + step
  if (index < 0 || index >= row.setSize) return null
  return { parent: row.entry.parent, index }
}
