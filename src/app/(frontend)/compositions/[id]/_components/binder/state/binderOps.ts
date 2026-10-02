import { type BinderMove, descendantIds, InvalidBinderMove, planMove } from '@/lib/binder/tree'

import type { BinderEntry } from '@front/_features/binder/types'

/*
 * The changes the writer makes to a binder, as data. Applying one is pure, so the same change
 * can be shown at once (optimistically) and then kept, or dropped if the server refuses it,
 * without disturbing the other changes made meanwhile.
 */
export type BinderOp =
  | { type: 'add'; entry: BinderEntry }
  | { type: 'rename'; id: number; title: string }
  // The item and everything inside it
  | { type: 'remove'; id: number }
  | { type: 'move'; id: number; move: BinderMove }

export function applyBinderOp(entries: BinderEntry[], op: BinderOp): BinderEntry[] {
  switch (op.type) {
    case 'add':
      return entries.some((entry) => entry.id === op.entry.id) ? entries : [...entries, op.entry]
    case 'rename':
      return entries.map((entry) => (entry.id === op.id ? { ...entry, title: op.title } : entry))
    case 'remove': {
      const removed = new Set([op.id, ...descendantIds(entries, op.id)])
      return entries.filter((entry) => !removed.has(entry.id))
    }
    case 'move': {
      try {
        const placed = new Map(planMove(entries, op.id, op.move).map((p) => [p.id, p]))
        return placed.size
          ? entries.map((entry) => ({ ...entry, ...placed.get(entry.id) }))
          : entries
      } catch (error) {
        // A move that no longer makes sense (e.g. its folder was deleted meanwhile) does nothing
        if (error instanceof InvalidBinderMove) return entries
        throw error
      }
    }
  }
}
