import { describe, expect, it } from 'vitest'

import type { BinderEntry } from '@front/_features/binder/types'
import { applyBinderOp } from '@front/compositions/[id]/_components/binder/state/binderOps'

// Part I (folder) > [Chant I, Notes (folder) > Idea], then Coda at the root
const entries: BinderEntry[] = [
  { id: 1, kind: 'folder', parent: null, position: 0, title: 'Part I' },
  { id: 2, kind: 'document', parent: 1, position: 0, title: 'Chant I' },
  { id: 3, kind: 'folder', parent: 1, position: 1, title: 'Notes' },
  { id: 4, kind: 'document', parent: 3, position: 0, title: 'Idea' },
  { id: 5, kind: 'document', parent: null, position: 1, title: 'Coda' },
]

const titles = (list: BinderEntry[]) => list.map((entry) => entry.title)

describe('applyBinderOp', () => {
  it('adds an entry once, even if the same addition comes twice', () => {
    const entry: BinderEntry = {
      id: 6,
      kind: 'document',
      parent: null,
      position: 2,
      title: 'Epilogue',
    }
    const once = applyBinderOp(entries, { type: 'add', entry })
    expect(applyBinderOp(once, { type: 'add', entry })).toHaveLength(6)
  })

  it('renames one entry and leaves the list untouched otherwise', () => {
    const renamed = applyBinderOp(entries, { type: 'rename', id: 5, title: 'Finale' })
    expect(titles(renamed)).toEqual(['Part I', 'Chant I', 'Notes', 'Idea', 'Finale'])
    expect(entries[4].title).toBe('Coda')
  })

  it('removes a folder with everything inside it', () => {
    expect(titles(applyBinderOp(entries, { type: 'remove', id: 1 }))).toEqual(['Coda'])
  })

  it('moves an entry, renumbering its new and old siblings', () => {
    const moved = applyBinderOp(entries, { type: 'move', id: 5, move: { parent: 1, index: 0 } })
    const byId = Object.fromEntries(
      moved.map((entry) => [entry.id, [entry.parent, entry.position]]),
    )
    expect(byId).toMatchObject({ 5: [1, 0], 2: [1, 1], 3: [1, 2], 1: [null, 0] })
  })

  it('ignores a move that no longer makes sense, e.g. into a deleted folder', () => {
    const withoutNotes = applyBinderOp(entries, { type: 'remove', id: 3 })
    expect(
      applyBinderOp(withoutNotes, { type: 'move', id: 5, move: { parent: 3, index: 0 } }),
    ).toBe(withoutNotes)
  })
})
