import { describe, expect, it } from 'vitest'

import type { BinderEntry } from '@front/_features/binder/types'
import { applyBinderOp } from '@front/compositions/[id]/_components/binder/state/binderOps'

import { uuid } from '../../helpers/ids'

// Part I (folder) > [Chant I, Notes (folder) > Idea], then Coda at the root
const entries: BinderEntry[] = [
  { id: uuid(1), kind: 'folder', parent: null, position: 0, title: 'Part I' },
  { id: uuid(2), kind: 'document', parent: uuid(1), position: 0, title: 'Chant I' },
  { id: uuid(3), kind: 'folder', parent: uuid(1), position: 1, title: 'Notes' },
  { id: uuid(4), kind: 'document', parent: uuid(3), position: 0, title: 'Idea' },
  { id: uuid(5), kind: 'document', parent: null, position: 1, title: 'Coda' },
]

const titles = (list: BinderEntry[]) => list.map((entry) => entry.title)

describe('applyBinderOp', () => {
  it('adds an entry once, even if the same addition comes twice', () => {
    const entry: BinderEntry = {
      id: uuid(6),
      kind: 'document',
      parent: null,
      position: 2,
      title: 'Epilogue',
    }
    const once = applyBinderOp(entries, { type: 'add', entry })
    expect(applyBinderOp(once, { type: 'add', entry })).toHaveLength(6)
  })

  it('renames one entry and leaves the list untouched otherwise', () => {
    const renamed = applyBinderOp(entries, { type: 'rename', id: uuid(5), title: 'Finale' })
    expect(titles(renamed)).toEqual(['Part I', 'Chant I', 'Notes', 'Idea', 'Finale'])
    expect(entries[4].title).toBe('Coda')
  })

  it('removes a folder with everything inside it', () => {
    expect(titles(applyBinderOp(entries, { type: 'remove', id: uuid(1) }))).toEqual(['Coda'])
  })

  it('moves an entry, renumbering its new and old siblings', () => {
    const moved = applyBinderOp(entries, {
      type: 'move',
      id: uuid(5),
      move: { parent: uuid(1), index: 0 },
    })
    const byId = Object.fromEntries(
      moved.map((entry) => [entry.id, [entry.parent, entry.position]]),
    )
    expect(byId).toMatchObject({
      [uuid(5)]: [uuid(1), 0],
      [uuid(2)]: [uuid(1), 1],
      [uuid(3)]: [uuid(1), 2],
      [uuid(1)]: [null, 0],
    })
  })

  it('ignores a move that no longer makes sense, e.g. into a deleted folder', () => {
    const withoutNotes = applyBinderOp(entries, { type: 'remove', id: uuid(3) })
    expect(
      applyBinderOp(withoutNotes, {
        type: 'move',
        id: uuid(5),
        move: { parent: uuid(3), index: 0 },
      }),
    ).toBe(withoutNotes)
  })
})
