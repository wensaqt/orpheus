import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine'
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element'
import { extractInstruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/list-item'
import { type RefObject, useEffect, useEffectEvent } from 'react'

import type { Id } from '@/lib/ids'

import type { DropOperation } from '../types'
import { isBinderDrag, isBinderDrop } from './dragData'

/*
 * Listens to every binder row drop and reports it as "this item, onto that one, this way".
 * The tree also scrolls by itself when a drag nears its edges, for long binders.
 */
export function useBinderDropMonitor(
  tree: RefObject<HTMLElement | null>,
  onDrop: (draggedId: Id, targetId: Id, operation: DropOperation) => void,
) {
  const handleDrop = useEffectEvent(onDrop)

  useEffect(() => {
    const element = tree.current
    if (!element) return
    return combine(
      monitorForElements({
        canMonitor: ({ source }) => isBinderDrag(source.data),
        onDrop: ({ source, location }) => {
          const target = location.current.dropTargets[0]
          const instruction = target && extractInstruction(target.data)
          if (!instruction || instruction.blocked) return
          if (!isBinderDrag(source.data) || !isBinderDrop(target.data)) return
          handleDrop(source.data.id, target.data.targetId, instruction.operation)
        },
      }),
      autoScrollForElements({
        element,
        canScroll: ({ source }) => isBinderDrag(source.data),
      }),
    )
  }, [tree])
}
