import type { Id } from '@/lib/ids'
import { inReadingOrder } from '@/lib/binder/tree'

import { DOCUMENT_FRESH_FOR_MS, MAX_CACHED_DOCUMENTS } from './constants'
import type { BinderEntry, DocumentSlot, DocumentText, LexicalContent } from './types'

/*
 * Pure rules of the client cache of documents' text (see documentStore.ts). Titles are not
 * cached: the binder entries hold them, live.
 */

// The more recent of two versions (ISO 8601 timestamps from one server compare as strings)
export function newerText(a?: DocumentText, b?: DocumentText): DocumentText | undefined {
  if (!a || !b) return a ?? b
  return a.updatedAt >= b.updatedAt ? a : b
}

/*
 * Whether a version found in the cache should replace the text shown: it must be newer than
 * the version shown, and actually different (a rename or a move also bumps the version).
 */
export function replacesShown(
  shownVersion: string,
  shownContent: LexicalContent,
  incoming: DocumentText,
): incoming is DocumentText & { content: LexicalContent } {
  return (
    incoming.updatedAt > shownVersion &&
    // Never null once the document has been saved, which a newer version implies
    incoming.content !== null &&
    JSON.stringify(incoming.content) !== JSON.stringify(shownContent)
  )
}

export const isFresh = (slot: DocumentSlot | undefined, now: number) =>
  slot?.status === 'missing' ||
  (slot?.status === 'ready' && now - slot.document.checkedAt < DOCUMENT_FRESH_FOR_MS)

/*
 * The slots with this one set and moved last (most recently confirmed), the oldest dropped beyond
 * the limit; a load in flight is never dropped, its answer would have nowhere to go.
 */
export function withSlot(
  slots: ReadonlyMap<Id, DocumentSlot>,
  id: Id,
  slot: DocumentSlot,
  max = MAX_CACHED_DOCUMENTS,
): Map<Id, DocumentSlot> {
  const next = new Map(slots)
  next.delete(id)
  next.set(id, slot)
  for (const [key, value] of next) {
    if (next.size <= max) break
    if (key !== id && value.status !== 'loading') next.delete(key)
  }
  return next
}

// The documents just before and after this one in reading order, to load ahead
export function neighbourDocuments(entries: BinderEntry[], id: Id): Id[] {
  const documents = inReadingOrder(entries).filter(
    (entry) => entry.kind === 'document' && entry.documentType !== 'score',
  )
  const index = documents.findIndex((entry) => entry.id === id)
  if (index === -1) return []
  return [documents[index - 1], documents[index + 1]].flatMap((entry) => (entry ? [entry.id] : []))
}
