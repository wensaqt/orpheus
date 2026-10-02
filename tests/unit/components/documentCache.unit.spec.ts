import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  DOCUMENT_FRESH_FOR_MS,
  type DocumentSlot,
  isFresh,
  neighbourDocuments,
  newerText,
  replacesShown,
  withSlot,
} from '@front/_features/binder/documentCache'
import type { BinderEntry } from '@front/_features/binder/types'
import { documentIdFromPath, editorPath, ROUTES } from '@front/_lib/routes'

import { uuid } from '../../helpers/ids'

const version = (updatedAt: string) => ({ content: null, updatedAt })
const ready = (checkedAt: number): DocumentSlot => ({
  status: 'ready',
  document: { ...version('2026-10-02T10:00:00.000Z'), checkedAt },
})

describe('newerText', () => {
  it('keeps the more recent version, whichever side it is on', () => {
    const older = version('2026-10-02T10:00:00.000Z')
    const newer = version('2026-10-02T10:00:01.000Z')
    expect(newerText(older, newer)).toBe(newer)
    expect(newerText(newer, older)).toBe(newer)
    expect(newerText(undefined, older)).toBe(older)
    expect(newerText(older, undefined)).toBe(older)
    expect(newerText()).toBeUndefined()
  })
})

describe('isFresh', () => {
  afterEach(() => vi.useRealTimers())

  it('trusts a recent check, a known absence, never an error or a load', () => {
    const now = 1_000_000
    expect(isFresh(ready(now - DOCUMENT_FRESH_FOR_MS + 1), now)).toBe(true)
    expect(isFresh(ready(now - DOCUMENT_FRESH_FOR_MS), now)).toBe(false)
    expect(isFresh({ status: 'missing' }, now)).toBe(true)
    expect(isFresh({ status: 'error' }, now)).toBe(false)
    expect(isFresh({ status: 'loading' }, now)).toBe(false)
    expect(isFresh(undefined, now)).toBe(false)
  })
})

describe('withSlot', () => {
  it('keeps the most recently used documents, never a load in flight', () => {
    let slots = new Map<string, DocumentSlot>()
    slots = withSlot(slots, uuid(1), { status: 'loading' }, 2)
    slots = withSlot(slots, uuid(2), ready(0), 2)
    slots = withSlot(slots, uuid(3), ready(0), 2)
    // uuid(1) is loading: uuid(2), the oldest finished one, goes instead
    expect([...slots.keys()]).toEqual([uuid(1), uuid(3)])
    slots = withSlot(slots, uuid(1), ready(0), 2)
    slots = withSlot(slots, uuid(4), ready(0), 2)
    expect([...slots.keys()]).toEqual([uuid(1), uuid(4)])
  })

  it('returns a new map, so a store snapshot changes with it', () => {
    const slots = new Map<string, DocumentSlot>()
    expect(withSlot(slots, uuid(1), ready(0))).not.toBe(slots)
    expect(slots.size).toBe(0)
  })
})

describe('neighbourDocuments', () => {
  // Prelude, Part I (folder) > [Chant I, Chant II], Coda
  const entries: BinderEntry[] = [
    { id: uuid(1), kind: 'document', parent: null, position: 0, title: 'Prelude' },
    { id: uuid(2), kind: 'folder', parent: null, position: 1, title: 'Part I' },
    { id: uuid(3), kind: 'document', parent: uuid(2), position: 0, title: 'Chant I' },
    { id: uuid(4), kind: 'document', parent: uuid(2), position: 1, title: 'Chant II' },
    { id: uuid(5), kind: 'document', parent: null, position: 2, title: 'Coda' },
  ]

  it('names the documents before and after in reading order, across folders', () => {
    expect(neighbourDocuments(entries, uuid(3))).toEqual([uuid(1), uuid(4)])
    expect(neighbourDocuments(entries, uuid(4))).toEqual([uuid(3), uuid(5)])
    expect(neighbourDocuments(entries, uuid(1))).toEqual([uuid(3)])
    expect(neighbourDocuments(entries, uuid(9))).toEqual([])
  })
})

describe('editor paths', () => {
  const composition = uuid(10)

  it('reads the composition and document back from a path', () => {
    expect(editorPath(ROUTES.document(composition, uuid(3)))).toEqual({
      compositionId: composition,
      documentId: uuid(3),
    })
    expect(editorPath(ROUTES.composition(composition))).toEqual({
      compositionId: composition,
      documentId: null,
    })
    for (const path of ['/', ROUTES.compositions, '/compositions/12/3', '/login']) {
      expect(editorPath(path)).toBeNull()
    }
  })

  it('finds the open document only for this composition', () => {
    expect(documentIdFromPath(ROUTES.document(composition, uuid(3)), composition)).toBe(uuid(3))
    expect(documentIdFromPath(ROUTES.document(uuid(11), uuid(3)), composition)).toBeNull()
    expect(documentIdFromPath(`${ROUTES.composition(composition)}/abc`, composition)).toBeNull()
  })
})

describe('replacesShown', () => {
  const text = (words: string) => ({
    root: { type: 'root' as const, children: [{ type: 'paragraph', text: words }] },
  })
  const shown = '2026-10-02T10:00:00.000Z'

  it('takes a newer, different version', () => {
    expect(
      replacesShown(shown, text('old'), {
        content: text('new'),
        updatedAt: '2026-10-02T10:00:01.000Z',
      }),
    ).toBe(true)
  })

  it('ignores a version that is not newer, or only renamed or moved (same text)', () => {
    expect(replacesShown(shown, text('old'), { content: text('new'), updatedAt: shown })).toBe(
      false,
    )
    expect(
      replacesShown(shown, text('same'), {
        content: text('same'),
        updatedAt: '2026-10-02T10:00:01.000Z',
      }),
    ).toBe(false)
  })
})
