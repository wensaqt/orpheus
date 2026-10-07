import { BINDER_ITEM_KINDS, type BinderItemKind } from '@/lib/binder/constants'
import type { BinderMove, BinderNodeData } from '@/lib/binder/tree'
import type { Id } from '@/lib/ids'

import { isOneOf, isRecord } from '@/lib/guards'
import { isId } from '@/lib/ids'

/*
 * Checks for what the client sends to the binder's server actions. Those are public endpoints:
 * whatever the types say, the values arrive unchecked.
 */

// A folder's id, or null for the root of the binder
export const isParent = (value: unknown): value is Id | null => value === null || isId(value)

export const isKind = (value: unknown): value is BinderItemKind => isOneOf(BINDER_ITEM_KINDS, value)

export const isMove = (value: unknown): value is BinderMove =>
  isRecord(value) &&
  isParent(value.parent) &&
  typeof value.index === 'number' &&
  Number.isInteger(value.index) &&
  value.index >= 0

export const isBinderNodes = (value: unknown): value is BinderNodeData[] =>
  Array.isArray(value) &&
  new Set(value.map((node) => (isRecord(node) ? node.id : undefined))).size === value.length &&
  value.every(
    (node) =>
      isRecord(node) &&
      isId(node.id) &&
      isKind(node.kind) &&
      isParent(node.parent) &&
      typeof node.position === 'number' &&
      Number.isInteger(node.position) &&
      node.position >= 0,
  )
