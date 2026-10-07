import { useSyncExternalStore } from 'react'

import type { Id } from '@/lib/ids'

import { isFresh, withSlot } from './documentCache'
import { fetchDocument } from './fetchDocument'
import type { CachedDocument, DocumentSlot, DocumentText } from './types'

/*
 * The text of the documents this tab has seen, so that switching documents needs no server
 * round trip. It lives at module scope on purpose: it must outlive the editor's layout (which
 * remounts when coming back from the compositions list) for the tab's whole session. It holds
 * the newest version known, whether loaded or saved here. Never written during render, and
 * empty on the server, where module state would be shared between users.
 */
let slots: ReadonlyMap<Id, DocumentSlot> = new Map()
const listeners = new Set<() => void>()
const inFlight = new Map<Id, Promise<void>>()
// Bumped when the store is emptied: answers to loads started before are then dropped
let generation = 0

const notify = () => listeners.forEach((listener) => listener())

function setSlot(id: Id, slot: DocumentSlot) {
  slots = withSlot(slots, id, slot)
  notify()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const useDocumentSlot = (id: Id) =>
  useSyncExternalStore(
    subscribe,
    () => slots.get(id),
    () => undefined,
  )

// A version confirmed by the server (a load or a save): kept unless a newer one is known
export function rememberDocument(id: Id, { content, updatedAt }: DocumentText) {
  const current = slots.get(id)
  const kept =
    current?.status === 'ready' && current.document.updatedAt > updatedAt
      ? current.document
      : { content, updatedAt }
  setSlot(id, {
    status: 'ready',
    document: { content: kept.content, updatedAt: kept.updatedAt, checkedAt: Date.now() },
  })
}

/*
 * The version the page was rendered with, checked when the server rendered it. The page may
 * come back from the router's cache much later: it then only fills an empty slot, and its old
 * check time makes it checked again.
 */
export function seedDocument(id: Id, document: CachedDocument) {
  if (slots.get(id)?.status === 'ready') return
  const { content, updatedAt, checkedAt } = document
  setSlot(id, { status: 'ready', document: { content, updatedAt, checkedAt } })
}

/*
 * Makes sure the document is cached and recent: does nothing when it is, loads it otherwise
 * (once, however many callers ask meanwhile). A cached version stays shown while it is checked.
 */
export function loadDocument(compositionId: Id, id: Id): Promise<void> {
  const current = slots.get(id)
  if (isFresh(current, Date.now())) return Promise.resolve()
  const pending = inFlight.get(id)
  if (pending) return pending

  const started = generation
  if (current?.status !== 'ready') setSlot(id, { status: 'loading' })
  const load = fetchDocument(compositionId, id)
    .then((document) => {
      if (started !== generation) return
      if (document) rememberDocument(id, document)
      else setSlot(id, { status: 'missing' })
    })
    .catch(() => {
      // Offline or a server error: a cached version still beats nothing
      if (started === generation && slots.get(id)?.status !== 'ready') {
        setSlot(id, { status: 'error' })
      }
    })
    .finally(() => {
      if (started === generation) inFlight.delete(id)
    })
  inFlight.set(id, load)
  return load
}

export const prefetchDocument = (compositionId: Id, id: Id) => void loadDocument(compositionId, id)

export function forgetDocuments(ids: Iterable<Id>) {
  const next = new Map(slots)
  for (const id of ids) next.delete(id)
  slots = next
  notify()
}

// On sign-out: nothing of this account's writing stays in memory, not even a load on its way
export function clearDocuments() {
  generation++
  inFlight.clear()
  slots = new Map()
  notify()
}
