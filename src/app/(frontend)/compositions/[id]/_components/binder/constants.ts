import type { Operation } from '@atlaskit/pragmatic-drag-and-drop-hitbox/list-item'

/*
 * Where a row can be dropped, relative to another one: the drag and drop library's operations,
 * also shown by the row's data-drop attribute (BinderRow.module.css matches these values).
 */
export const DROP = {
  before: 'reorder-before',
  after: 'reorder-after',
  inside: 'combine',
} as const satisfies Record<string, Operation>
