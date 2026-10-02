import type { Operation } from '@atlaskit/pragmatic-drag-and-drop-hitbox/list-item'

import { type BinderMove, buildTree, type BinderTreeNode, siblingsOf } from '@/lib/binder/tree'
import type { Id } from '@/lib/ids'

import type { BinderEntry } from '@front/_features/binder/types'

// One visible line of the binder tree, with what ARIA needs to describe it
export type BinderRow = {
  entry: BinderEntry
  level: number
  // Number of items at this level of its folder, and its rank among them (1-based)
  setSize: number
  posInSet: number
  hasChildren: boolean
  expanded: boolean
}

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

/*
 * Where a row can be dropped, relative to another one: the drag and drop library's operations,
 * also shown by the row's data-drop attribute (BinderRow.module.css matches these values).
 */
export const DROP = {
  before: 'reorder-before',
  after: 'reorder-after',
  inside: 'combine',
} as const satisfies Record<string, Operation>

export type DropOperation = Operation

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
