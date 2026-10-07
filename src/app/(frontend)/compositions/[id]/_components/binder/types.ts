import type { Operation } from '@atlaskit/pragmatic-drag-and-drop-hitbox/list-item'

import type { BinderEntry } from '@front/_features/binder/types'

// One visible line of the binder tree, with what ARIA needs to describe it
export type BinderRow = {
  entry: BinderEntry
  level: number
  // Number of items at this level of its folder, and its rank among them (1-based)
  setSize: number
  posInSet: number
  hasChildren: boolean
  expanded: boolean
}

// Where a row is dropped, relative to another one: the drag and drop library's operations
export type DropOperation = Operation
