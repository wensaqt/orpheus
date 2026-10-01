/*
 * Pure functions on a binder's flat list of items (as stored: each item points to its parent).
 * The whole binder of a composition is loaded at once, so they work in memory.
 */
import type { BinderItemKind } from './constants'

export type BinderNodeData = {
  id: number
  kind: BinderItemKind
  parent: number | null
  position: number
}

export type BinderTreeNode<Item extends BinderNodeData> = Item & {
  children: BinderTreeNode<Item>[]
}

const byPosition = (a: BinderNodeData, b: BinderNodeData) => a.position - b.position || a.id - b.id

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
