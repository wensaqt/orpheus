import { type Id, isId } from '@/lib/ids'

/*
 * The data a dragged binder row carries. A symbol key tells it apart from anything else that
 * can be dragged (files, text); "excluded" lists where it cannot be dropped (itself and its
 * contents), computed when the drag starts.
 */
const BINDER_DRAG = Symbol('binder-item')

export type BinderDragData = { [BINDER_DRAG]: true; id: Id; excluded: Id[] }

export const binderDragData = (id: Id, excluded: Id[]): BinderDragData => ({
  [BINDER_DRAG]: true,
  id,
  excluded,
})

export const isBinderDrag = (data: Record<string | symbol, unknown>): data is BinderDragData =>
  data[BINDER_DRAG] === true

// What a row's drop target carries: which row it is
export type BinderDropData = { targetId: Id }

export const isBinderDrop = (data: Record<string | symbol, unknown>): data is BinderDropData =>
  isId(data.targetId)
