import { describe, expect, it } from 'vitest'

import {
  DROP,
  dropDestination,
  intoFolder,
  moveDestinations,
  reorderDestination,
  visibleRows,
} from '@front/compositions/[id]/_components/binder/rows'
import type { BinderEntry } from '@front/_features/binder/types'

import { uuid } from '../../helpers/ids'

// Prelude, then Part I (folder) > [Chant I, Notes (folder) > Idea]
const entries: BinderEntry[] = [
  { id: uuid(1), kind: 'document', parent: null, position: 0, title: 'Prelude' },
  { id: uuid(2), kind: 'folder', parent: null, position: 1, title: 'Part I' },
  { id: uuid(3), kind: 'document', parent: uuid(2), position: 0, title: 'Chant I' },
  { id: uuid(4), kind: 'folder', parent: uuid(2), position: 1, title: 'Notes' },
  { id: uuid(5), kind: 'document', parent: uuid(4), position: 0, title: 'Idea' },
]

describe('visibleRows', () => {
  it('lists every line in reading order, with its level and place among siblings', () => {
    expect(
      visibleRows(entries, new Set()).map((row) => [
        row.entry.title,
        row.level,
        row.posInSet,
        row.setSize,
      ]),
    ).toEqual([
      ['Prelude', 1, 1, 2],
      ['Part I', 1, 2, 2],
      ['Chant I', 2, 1, 2],
      ['Notes', 2, 2, 2],
      ['Idea', 3, 1, 1],
    ])
  })

  it('hides the contents of a collapsed folder, at any depth', () => {
    const rows = visibleRows(entries, new Set([uuid(2)]))
    expect(rows.map((row) => row.entry.title)).toEqual(['Prelude', 'Part I'])
    expect(rows[1]).toMatchObject({ expanded: false, hasChildren: true })
  })
})

describe('dropDestination', () => {
  it('places a dropped item before or after the target, among its siblings', () => {
    // Idea (5) dropped before / after Chant I (3), inside Part I (2)
    expect(dropDestination(entries, uuid(5), uuid(3), DROP.before)).toEqual({
      parent: uuid(2),
      index: 0,
    })
    expect(dropDestination(entries, uuid(5), uuid(3), DROP.after)).toEqual({
      parent: uuid(2),
      index: 1,
    })
  })

  it('does not count the dragged item when it moves among its own siblings', () => {
    // Prelude (1) dropped after Part I (2): Part I is then first, Prelude second
    expect(dropDestination(entries, uuid(1), uuid(2), DROP.after)).toEqual({
      parent: null,
      index: 1,
    })
  })

  it('puts an item dropped on a folder at its end', () => {
    expect(dropDestination(entries, uuid(1), uuid(4), DROP.inside)).toEqual(intoFolder(uuid(4)))
  })
})

describe('moveDestinations', () => {
  it('offers every folder except the moved one and its contents', () => {
    expect(
      moveDestinations(entries, new Set([uuid(4), uuid(5)])).map((row) => row.entry.title),
    ).toEqual(['Part I'])
  })
})

describe('reorderDestination', () => {
  it('moves one step among siblings, within bounds', () => {
    const rows = visibleRows(entries, new Set())
    const chant = rows.find((row) => row.entry.id === uuid(3))!
    expect(reorderDestination(chant, 1)).toEqual({ parent: uuid(2), index: 1 })
    expect(reorderDestination(chant, -1)).toBeNull()
    const notes = rows.find((row) => row.entry.id === uuid(4))!
    expect(reorderDestination(notes, 1)).toBeNull()
  })
})
