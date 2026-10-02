import { describe, expect, it } from 'vitest'

import {
  type BinderNodeData,
  buildTree,
  descendantIds,
  firstDocument,
  inReadingOrder,
  InvalidBinderMove,
  planMove,
  toBinderNode,
  wouldCreateCycle,
} from '@/lib/binder/tree'

import { uuid } from '../../helpers/ids'

type Item = BinderNodeData & { title: string }

// Part I (folder) > [Chant II, Notes (folder) > Chant III], Chant I at the root, given unsorted
const items: Item[] = [
  { id: uuid(4), kind: 'document', parent: uuid(1), position: 1, title: 'Chant II' },
  { id: uuid(1), kind: 'folder', parent: null, position: 1, title: 'Part I' },
  { id: uuid(5), kind: 'document', parent: uuid(3), position: 0, title: 'Chant III' },
  { id: uuid(2), kind: 'document', parent: null, position: 0, title: 'Chant I' },
  { id: uuid(3), kind: 'folder', parent: uuid(1), position: 0, title: 'Notes' },
]

const titles = (list: { title: string }[]) => list.map((item) => item.title)

describe('binder tree', () => {
  it('nests items and orders siblings by position', () => {
    const tree = buildTree(items)
    expect(titles(tree)).toEqual(['Chant I', 'Part I'])
    expect(titles(tree[1].children)).toEqual(['Notes', 'Chant II'])
    expect(titles(tree[1].children[0].children)).toEqual(['Chant III'])
  })

  it('keeps an item whose parent is missing, at the root', () => {
    const orphan: Item = {
      id: uuid(9),
      kind: 'document',
      parent: uuid(42),
      position: 0,
      title: 'Orphan',
    }
    expect(titles(buildTree([orphan]))).toEqual(['Orphan'])
  })

  it('reads depth first and opens the first document', () => {
    expect(titles(inReadingOrder(items))).toEqual([
      'Chant I',
      'Part I',
      'Notes',
      'Chant III',
      'Chant II',
    ])
    expect(firstDocument(items)?.title).toBe('Chant I')
    expect(firstDocument(items.filter((item) => item.id !== uuid(2)))?.title).toBe('Chant III')
    expect(firstDocument(items.filter((item) => item.kind === 'folder'))).toBeNull()
  })

  it('finds everything inside a folder', () => {
    expect(descendantIds(items, uuid(1)).sort()).toEqual([3, 4, 5].map(uuid))
    expect(descendantIds(items, uuid(2))).toEqual([])
  })

  it('detects a move that would put a folder inside itself', () => {
    expect(wouldCreateCycle(items, uuid(1), uuid(1))).toBe(true)
    expect(wouldCreateCycle(items, uuid(1), uuid(3))).toBe(true)
    expect(wouldCreateCycle(items, uuid(3), null)).toBe(false)
    expect(wouldCreateCycle(items, uuid(4), uuid(3))).toBe(false)
  })

  it('survives a cycle in corrupted data', () => {
    const looped: BinderNodeData[] = [
      { id: uuid(1), kind: 'folder', parent: uuid(2), position: 0 },
      { id: uuid(2), kind: 'folder', parent: uuid(1), position: 0 },
    ]
    expect(descendantIds(looped, uuid(1)).sort()).toEqual([uuid(2)])
  })
})

describe('planMove', () => {
  const placementsOf = (moves: ReturnType<typeof planMove>) =>
    Object.fromEntries(moves.map(({ id, parent, position }) => [id, [parent, position]]))

  it('reorders among siblings, renumbering only what changes', () => {
    // Chant II (4) before Notes (3) inside Part I (1)
    expect(placementsOf(planMove(items, uuid(4), { parent: uuid(1), index: 0 }))).toEqual({
      [uuid(4)]: [uuid(1), 0],
      [uuid(3)]: [uuid(1), 1],
    })
  })

  it('moves into another folder and closes the gap left behind', () => {
    // Chant I (2) leaves the root for the end of Part I (1)
    expect(placementsOf(planMove(items, uuid(2), { parent: uuid(1), index: 99 }))).toEqual({
      [uuid(2)]: [uuid(1), 2],
      [uuid(1)]: [null, 0],
    })
  })

  it('moves a folder with its contents, which keep their place inside it', () => {
    expect(placementsOf(planMove(items, uuid(3), { parent: null, index: 0 }))).toEqual({
      [uuid(3)]: [null, 0],
      [uuid(2)]: [null, 1],
      [uuid(1)]: [null, 2],
      [uuid(4)]: [uuid(1), 0],
    })
  })

  it('returns nothing when the item stays where it is', () => {
    expect(planMove(items, uuid(2), { parent: null, index: 0 })).toEqual([])
  })

  it('counts the index without the moved item when it moves down among its siblings', () => {
    // Notes (3) then Chant II (4) inside Part I: index 1 puts Notes after Chant II
    expect(placementsOf(planMove(items, uuid(3), { parent: uuid(1), index: 1 }))).toEqual({
      [uuid(4)]: [uuid(1), 0],
      [uuid(3)]: [uuid(1), 1],
    })
  })

  it('refuses an index that is not an integer', () => {
    expect(() => planMove(items, uuid(4), { parent: uuid(1), index: Number.NaN })).toThrow(
      InvalidBinderMove,
    )
    expect(() => planMove(items, uuid(4), { parent: uuid(1), index: 0.5 })).toThrow(
      InvalidBinderMove,
    )
  })

  it('refuses a document as destination, or a folder inside itself', () => {
    expect(() => planMove(items, uuid(4), { parent: uuid(2), index: 0 })).toThrow(InvalidBinderMove)
    expect(() => planMove(items, uuid(1), { parent: uuid(3), index: 0 })).toThrow(InvalidBinderMove)
    expect(() => planMove(items, uuid(99), { parent: null, index: 0 })).toThrow(InvalidBinderMove)
  })
})

describe('toBinderNode', () => {
  it('keeps the place of an item, its parent as an id whether populated or not', () => {
    const node = { id: uuid(3), kind: 'document', position: 2 } as const
    expect(toBinderNode({ ...node, parent: uuid(7) })).toEqual({ ...node, parent: uuid(7) })
    expect(toBinderNode({ ...node, parent: null })).toEqual({ ...node, parent: null })
    expect(toBinderNode({ ...node, parent: undefined })).toEqual({ ...node, parent: null })
  })
})
