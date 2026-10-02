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

type Item = BinderNodeData & { title: string }

// Part I (folder) > [Chant II, Notes (folder) > Chant III], Chant I at the root, given unsorted
const items: Item[] = [
  { id: 4, kind: 'document', parent: 1, position: 1, title: 'Chant II' },
  { id: 1, kind: 'folder', parent: null, position: 1, title: 'Part I' },
  { id: 5, kind: 'document', parent: 3, position: 0, title: 'Chant III' },
  { id: 2, kind: 'document', parent: null, position: 0, title: 'Chant I' },
  { id: 3, kind: 'folder', parent: 1, position: 0, title: 'Notes' },
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
    const orphan: Item = { id: 9, kind: 'document', parent: 42, position: 0, title: 'Orphan' }
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
    expect(firstDocument(items.filter((item) => item.id !== 2))?.title).toBe('Chant III')
    expect(firstDocument(items.filter((item) => item.kind === 'folder'))).toBeNull()
  })

  it('finds everything inside a folder', () => {
    expect(descendantIds(items, 1).sort()).toEqual([3, 4, 5])
    expect(descendantIds(items, 2)).toEqual([])
  })

  it('detects a move that would put a folder inside itself', () => {
    expect(wouldCreateCycle(items, 1, 1)).toBe(true)
    expect(wouldCreateCycle(items, 1, 3)).toBe(true)
    expect(wouldCreateCycle(items, 3, null)).toBe(false)
    expect(wouldCreateCycle(items, 4, 3)).toBe(false)
  })

  it('survives a cycle in corrupted data', () => {
    const looped: BinderNodeData[] = [
      { id: 1, kind: 'folder', parent: 2, position: 0 },
      { id: 2, kind: 'folder', parent: 1, position: 0 },
    ]
    expect(descendantIds(looped, 1).sort()).toEqual([2])
  })
})

describe('planMove', () => {
  const placementsOf = (moves: ReturnType<typeof planMove>) =>
    Object.fromEntries(moves.map(({ id, parent, position }) => [id, [parent, position]]))

  it('reorders among siblings, renumbering only what changes', () => {
    // Chant II (4) before Notes (3) inside Part I (1)
    expect(placementsOf(planMove(items, 4, { parent: 1, index: 0 }))).toEqual({
      4: [1, 0],
      3: [1, 1],
    })
  })

  it('moves into another folder and closes the gap left behind', () => {
    // Chant I (2) leaves the root for the end of Part I (1)
    expect(placementsOf(planMove(items, 2, { parent: 1, index: 99 }))).toEqual({
      2: [1, 2],
      1: [null, 0],
    })
  })

  it('moves a folder with its contents, which keep their place inside it', () => {
    expect(placementsOf(planMove(items, 3, { parent: null, index: 0 }))).toEqual({
      3: [null, 0],
      2: [null, 1],
      1: [null, 2],
      4: [1, 0],
    })
  })

  it('returns nothing when the item stays where it is', () => {
    expect(planMove(items, 2, { parent: null, index: 0 })).toEqual([])
  })

  it('counts the index without the moved item when it moves down among its siblings', () => {
    // Notes (3) then Chant II (4) inside Part I: index 1 puts Notes after Chant II
    expect(placementsOf(planMove(items, 3, { parent: 1, index: 1 }))).toEqual({
      4: [1, 0],
      3: [1, 1],
    })
  })

  it('refuses an index that is not an integer', () => {
    expect(() => planMove(items, 4, { parent: 1, index: Number.NaN })).toThrow(InvalidBinderMove)
    expect(() => planMove(items, 4, { parent: 1, index: 0.5 })).toThrow(InvalidBinderMove)
  })

  it('refuses a document as destination, or a folder inside itself', () => {
    expect(() => planMove(items, 4, { parent: 2, index: 0 })).toThrow(InvalidBinderMove)
    expect(() => planMove(items, 1, { parent: 3, index: 0 })).toThrow(InvalidBinderMove)
    expect(() => planMove(items, 99, { parent: null, index: 0 })).toThrow(InvalidBinderMove)
  })
})

describe('toBinderNode', () => {
  it('keeps the place of an item, its parent as an id whether populated or not', () => {
    const node = { id: 3, kind: 'document', position: 2 } as const
    expect(toBinderNode({ ...node, parent: 7 })).toEqual({ ...node, parent: 7 })
    expect(toBinderNode({ ...node, parent: null })).toEqual({ ...node, parent: null })
    expect(toBinderNode({ ...node, parent: undefined })).toEqual({ ...node, parent: null })
  })
})
