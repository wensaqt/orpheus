import { BINDER_ITEM_KINDS, type BinderItemKind } from '@/lib/binder/constants'
import type { BinderMove } from '@/lib/binder/tree'

import { isId } from '@front/_lib/validation'

/*
 * Checks for what the client sends to the binder's server actions. Those are public endpoints:
 * whatever the types say, the values arrive unchecked.
 */

// A folder's id, or null for the root of the binder
export const isParent = (value: unknown): value is number | null => value === null || isId(value)

export const isKind = (value: unknown): value is BinderItemKind =>
  (BINDER_ITEM_KINDS as readonly unknown[]).includes(value)

export const isMove = (value: unknown): value is BinderMove =>
  typeof value === 'object' &&
  value !== null &&
  'parent' in value &&
  'index' in value &&
  isParent(value.parent) &&
  typeof value.index === 'number' &&
  Number.isInteger(value.index) &&
  value.index >= 0
