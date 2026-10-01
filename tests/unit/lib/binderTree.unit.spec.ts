import { describe, expect, it } from 'vitest'

import {
  type BinderNodeData,
  buildTree,
  descendantIds,
  firstDocument,
  inReadingOrder,
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
