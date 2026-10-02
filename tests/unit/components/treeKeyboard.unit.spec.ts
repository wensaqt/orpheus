import { describe, expect, it } from 'vitest'

import type { BinderEntry } from '@front/_features/binder/types'
import { visibleRows } from '@front/compositions/[id]/_components/binder/rows'
import { treeKeyCommand } from '@front/compositions/[id]/_components/binder/tree/treeKeyboard'

// Prelude, Part I (folder) > Chant I, Empty (folder)
const entries: BinderEntry[] = [
  { id: 1, kind: 'document', parent: null, position: 0, title: 'Prelude' },
  { id: 2, kind: 'folder', parent: null, position: 1, title: 'Part I' },
  { id: 3, kind: 'document', parent: 2, position: 0, title: 'Chant I' },
  { id: 4, kind: 'folder', parent: null, position: 2, title: 'Empty' },
]

const keys = { shiftKey: false, altKey: false, metaKey: false, ctrlKey: false }
const press = (
  focused: number,
  key: string,
  modifiers: Partial<typeof keys> = {},
  collapsed: number[] = [],
) =>
  treeKeyCommand(visibleRows(entries, new Set(collapsed)), focused, { ...keys, key, ...modifiers })

describe('treeKeyCommand', () => {
  it('moves the focus through the visible rows, and jumps to the ends', () => {
    expect(press(1, 'ArrowDown')).toEqual({ type: 'focus', id: 2 })
    expect(press(2, 'ArrowDown')).toEqual({ type: 'focus', id: 3 })
    expect(press(2, 'ArrowDown', {}, [2])).toEqual({ type: 'focus', id: 4 })
    expect(press(1, 'ArrowUp')).toBeNull()
    expect(press(3, 'Home')).toEqual({ type: 'focus', id: 1 })
    expect(press(1, 'End')).toEqual({ type: 'focus', id: 4 })
  })

  it('opens and closes folders with the side arrows, and goes up to the parent', () => {
    expect(press(2, 'ArrowRight', {}, [2])).toEqual({ type: 'setOpen', id: 2, open: true })
    expect(press(2, 'ArrowRight')).toEqual({ type: 'focus', id: 3 })
    // An open folder with nothing inside: nowhere to go
    expect(press(4, 'ArrowRight')).toBeNull()
    expect(press(2, 'ArrowLeft')).toEqual({ type: 'setOpen', id: 2, open: false })
    expect(press(3, 'ArrowLeft')).toEqual({ type: 'focus', id: 2 })
    expect(press(1, 'ArrowLeft')).toBeNull()
  })

  it('maps the binder’s own keys', () => {
    expect(press(1, 'Enter')).toEqual({ type: 'activate', id: 1 })
    expect(press(1, ' ')).toEqual({ type: 'activate', id: 1 })
    expect(press(1, 'F2')).toEqual({ type: 'rename', id: 1 })
    expect(press(1, 'Delete')).toEqual({ type: 'delete', id: 1 })
    expect(press(1, 'Backspace', { metaKey: true })).toEqual({ type: 'delete', id: 1 })
    expect(press(1, 'Backspace')).toBeNull()
    expect(press(1, 'F10', { shiftKey: true })).toEqual({ type: 'menu', id: 1 })
    expect(press(1, 'ContextMenu')).toEqual({ type: 'menu', id: 1 })
    expect(press(2, 'ArrowDown', { altKey: true })).toEqual({ type: 'reorder', id: 2, step: 1 })
  })

  it('does nothing for an unknown row or key', () => {
    expect(press(99, 'ArrowDown')).toBeNull()
    expect(press(1, 'a')).toBeNull()
  })
})
