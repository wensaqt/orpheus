/*
 * Pure functions on a binder's flat list of items (as stored: each item points to its parent).
 * The whole binder of a composition is loaded at once, so they work in memory.
 */
import type { BinderItem } from '@/payload-types'

import { relationId } from '../relationId'

export type BinderNodeData = Pick<BinderItem, 'id' | 'kind' | 'position'> & {
  parent: number | null
}

// An item as Payload returns it (parent as an id or a populated item), reduced to its place
export const toBinderNode = (item: Pick<BinderItem, 'id' | 'kind' | 'parent' | 'position'>) => ({
  id: item.id,
  kind: item.kind,
  parent: relationId(item.parent),
  position: item.position,
})

export type BinderTreeNode<Item extends BinderNodeData> = Item & {
  children: BinderTreeNode<Item>[]
}

// Sibling order: by position, ties (e.g. after concurrent writes) broken by creation order
export const byPosition = (a: BinderNodeData, b: BinderNodeData) =>
  a.position - b.position || a.id - b.id

// The items directly inside a folder (or at the root), in order, optionally leaving one out
export const siblingsOf = <Item extends BinderNodeData>(
  items: Item[],
  parent: number | null,
  excluding?: number,
) => items.filter((item) => item.parent === parent && item.id !== excluding).sort(byPosition)

/*
 * Nested tree, siblings in their order. An item whose parent is missing (e.g. a dangling
 * reference) is shown at the root rather than lost.
 */
export function buildTree<Item extends BinderNodeData>(items: Item[]): BinderTreeNode<Item>[] {
  const nodes = new Map<number, BinderTreeNode<Item>>(
    items.map((item) => [item.id, { ...item, children: [] }]),
  )
  const roots: BinderTreeNode<Item>[] = []
  for (const node of nodes.values()) {
    const parent = node.parent === null ? undefined : nodes.get(node.parent)
    ;(parent ? parent.children : roots).push(node)
  }
  const sort = (list: BinderTreeNode<Item>[]) => {
    list.sort(byPosition)
    for (const node of list) sort(node.children)
  }
  sort(roots)
  return roots
}

// Items in reading order: each one followed by its contents, depth first
export function inReadingOrder<Item extends BinderNodeData>(items: Item[]): Item[] {
  const byId = new Map(items.map((item) => [item.id, item]))
  const ordered: Item[] = []
  const visit = (nodes: BinderTreeNode<Item>[]) => {
    for (const node of nodes) {
      ordered.push(byId.get(node.id)!)
      visit(node.children)
    }
  }
  visit(buildTree(items))
  return ordered
}

// The document opened by default: the first one in reading order
export const firstDocument = <Item extends BinderNodeData>(items: Item[]) =>
  inReadingOrder(items).find((item) => item.kind === 'document') ?? null

// Every item inside the given one, at any depth (not the item itself)
export function descendantIds(items: BinderNodeData[], id: number): number[] {
  const childrenOf = new Map<number, number[]>()
  for (const item of items) {
    if (item.parent === null) continue
    childrenOf.set(item.parent, [...(childrenOf.get(item.parent) ?? []), item.id])
  }
  const found: number[] = []
  const stack = [...(childrenOf.get(id) ?? [])]
  while (stack.length) {
    const next = stack.pop()!
    // Guards against a cycle in corrupted data
    if (found.includes(next) || next === id) continue
    found.push(next)
    stack.push(...(childrenOf.get(next) ?? []))
  }
  return found
}

// Whether moving the item under this parent would put it inside itself
export const wouldCreateCycle = (items: BinderNodeData[], id: number, parent: number | null) =>
  parent !== null && (parent === id || descendantIds(items, id).includes(parent))

export type BinderMove = { parent: number | null; index: number }
export type BinderPlacement = { id: number; parent: number | null; position: number }

export class InvalidBinderMove extends Error {
  constructor(reason: string) {
    super(reason)
    this.name = 'InvalidBinderMove'
  }
}

/*
 * The writes needed to move an item to an index among the children of a folder (or the root),
 * the index counting the destination's items without the moved one (so it can be past the end):
 * the destination's items are renumbered 0..n with the item inserted, and the origin's closes
 * its gap. Only items whose parent or position actually changes are returned.
 */
export function planMove(
  items: BinderNodeData[],
  id: number,
  { parent, index }: BinderMove,
): BinderPlacement[] {
  const item = items.find((candidate) => candidate.id === id)
  if (!item) throw new InvalidBinderMove('Unknown item')
  if (!Number.isInteger(index)) throw new InvalidBinderMove('The index must be an integer')
  if (parent !== null && items.find((candidate) => candidate.id === parent)?.kind !== 'folder') {
    throw new InvalidBinderMove('Items can only go into a folder')
  }
  if (wouldCreateCycle(items, id, parent)) {
    throw new InvalidBinderMove('A folder cannot go inside itself')
  }

  const destination = siblingsOf(items, parent, id)
  const at = Math.min(Math.max(index, 0), destination.length)
  destination.splice(at, 0, item)

  const placements = destination.map((node, position) => ({ id: node.id, parent, position }))
  if (item.parent !== parent) {
    siblingsOf(items, item.parent, id).forEach((node, position) =>
      placements.push({ id: node.id, parent: item.parent, position }),
    )
  }
  const before = new Map(items.map((node) => [node.id, node]))
  return placements.filter(({ id: placed, parent: to, position }) => {
    const was = before.get(placed)!
    return was.parent !== to || was.position !== position
  })
}
