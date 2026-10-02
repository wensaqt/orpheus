import type { Id } from '@/lib/ids'

import type { BinderRow } from '../rows'

// What a key does in the binder tree, decided without touching the DOM
export type TreeCommand =
  | { type: 'focus'; id: Id }
  | { type: 'setOpen'; id: Id; open: boolean }
  | { type: 'activate'; id: Id }
  | { type: 'rename'; id: Id }
  | { type: 'delete'; id: Id }
  | { type: 'menu'; id: Id }
  | { type: 'reorder'; id: Id; step: -1 | 1 }

type Keystroke = Pick<KeyboardEvent, 'key' | 'shiftKey' | 'altKey' | 'metaKey' | 'ctrlKey'>

/*
 * The ARIA tree keys (https://www.w3.org/WAI/ARIA/apg/patterns/treeview/): arrows move and
 * fold, Home and End jump, Enter or Space activates. Plus the binder's own: F2 renames,
 * Delete (or Cmd/Ctrl+Backspace) deletes, Shift+F10 or the context menu key opens the row's
 * menu, Alt+Up/Down moves the row among its siblings.
 */
export function treeKeyCommand(
  rows: BinderRow[],
  focusedId: Id,
  keystroke: Keystroke,
): TreeCommand | null {
  const index = rows.findIndex((row) => row.entry.id === focusedId)
  const row = rows[index]
  if (!row) return null
  const { id, kind, parent } = row.entry
  const at = (offset: number) => rows[index + offset]?.entry.id
  const { key, shiftKey, altKey, metaKey, ctrlKey } = keystroke

  if (altKey && (key === 'ArrowUp' || key === 'ArrowDown')) {
    return { type: 'reorder', id, step: key === 'ArrowUp' ? -1 : 1 }
  }
  if (key === 'ContextMenu' || (shiftKey && key === 'F10')) return { type: 'menu', id }
  if (key === 'Delete' || ((metaKey || ctrlKey) && key === 'Backspace')) {
    return { type: 'delete', id }
  }

  switch (key) {
    case 'ArrowDown':
      return at(1) === undefined ? null : { type: 'focus', id: at(1)! }
    case 'ArrowUp':
      return at(-1) === undefined ? null : { type: 'focus', id: at(-1)! }
    case 'Home':
      return { type: 'focus', id: rows[0].entry.id }
    case 'End':
      return { type: 'focus', id: rows[rows.length - 1].entry.id }
    case 'ArrowRight':
      if (kind !== 'folder') return null
      if (!row.expanded) return { type: 'setOpen', id, open: true }
      return row.hasChildren ? { type: 'focus', id: at(1)! } : null
    case 'ArrowLeft':
      if (kind === 'folder' && row.expanded) return { type: 'setOpen', id, open: false }
      return parent === null ? null : { type: 'focus', id: parent }
    case 'Enter':
    case ' ':
      return { type: 'activate', id }
    case 'F2':
      return { type: 'rename', id }
    default:
      return null
  }
}
