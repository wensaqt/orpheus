import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine'
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import {
  attachInstruction,
  extractInstruction,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/list-item'
import { type RefObject, useEffect, useEffectEvent, useState } from 'react'

import type { Id } from '@/lib/ids'

import { type BinderRow, DROP, type DropOperation } from '../rows'
import { binderDragData, isBinderDrag } from './dragData'

type RowDragOptions = {
  row: BinderRow
  // No dragging while the title is being edited: the text field needs the mouse
  disabled: boolean
  // Itself and its contents, where it cannot be dropped
  excludedWhenDragged: () => Id[]
}

/*
 * Makes a binder row draggable and a drop target: before it, after it, or into it when it is
 * a folder. The marker to draw while something hovers is returned.
 */
export function useRowDragAndDrop(
  element: RefObject<HTMLElement | null>,
  { row, disabled, excludedWhenDragged }: RowDragOptions,
) {
  const [dragging, setDragging] = useState(false)
  const [drop, setDrop] = useState<DropOperation | null>(null)
  const { id, kind } = row.entry
  const isFolder = kind === 'folder'
  /*
   * Below an open folder, the line would read as "first inside it" while the item would land
   * after the whole folder: that edge is left out, dropping onto the folder covers "inside"
   */
  const afterAvailable = !(isFolder && row.expanded && row.hasChildren)

  const canDrag = useEffectEvent(() => !disabled)
  const initialData = useEffectEvent(() => binderDragData(id, excludedWhenDragged()))

  useEffect(() => {
    const target = element.current
    if (!target) return
    return combine(
      draggable({
        element: target,
        canDrag: () => canDrag(),
        getInitialData: () => initialData(),
        onDragStart: () => setDragging(true),
        onDrop: () => setDragging(false),
      }),
      dropTargetForElements({
        element: target,
        canDrop: ({ source }) => isBinderDrag(source.data) && !source.data.excluded.includes(id),
        getData: ({ input, element: dropElement }) =>
          attachInstruction(
            { targetId: id },
            {
              input,
              element: dropElement,
              operations: {
                [DROP.before]: 'available',
                [DROP.after]: afterAvailable ? 'available' : 'not-available',
                [DROP.inside]: isFolder ? 'available' : 'not-available',
              },
            },
          ),
        onDrag: ({ self }) => {
          const instruction = extractInstruction(self.data)
          setDrop(instruction && !instruction.blocked ? instruction.operation : null)
        },
        onDragLeave: () => setDrop(null),
        onDrop: () => setDrop(null),
      }),
    )
  }, [element, id, isFolder, afterAvailable])

  return { dragging, drop }
}
