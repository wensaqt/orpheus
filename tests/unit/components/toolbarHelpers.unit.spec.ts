import { describe, expect, it } from 'vitest'

import { rovingIndex } from '@front/_components/ui/rovingFocus'
import { ariaShortcut, shortcutLabel } from '@front/_components/ui/shortcuts'
import { pressedWithKeyboard } from '@front/compositions/[id]/_components/header/toolbarActions'

describe('shortcutLabel', () => {
  it('uses Apple’s symbols, Shift before Cmd, on a Mac', () => {
    expect(shortcutLabel('Mod+B', true)).toBe('⌘B')
    expect(shortcutLabel('Mod+Shift+Z', true)).toBe('⇧⌘Z')
    expect(shortcutLabel('Mod+Enter', true)).toBe('⌘↩')
  })

  it('spells the keys out elsewhere', () => {
    expect(shortcutLabel('Mod+B', false)).toBe('Ctrl+B')
    expect(shortcutLabel('Mod+Shift+Z', false)).toBe('Ctrl+Shift+Z')
  })

  it('names the keys as aria-keyshortcuts does', () => {
    expect(ariaShortcut('Mod+Shift+Z', true)).toBe('Meta+Shift+Z')
    expect(ariaShortcut('Mod+B', false)).toBe('Control+B')
  })
})

describe('rovingIndex', () => {
  it('steps with the arrows of its orientation, wrapping around', () => {
    expect(rovingIndex('ArrowRight', 0, 3, 'horizontal')).toBe(1)
    expect(rovingIndex('ArrowRight', 2, 3, 'horizontal')).toBe(0)
    expect(rovingIndex('ArrowLeft', 0, 3, 'horizontal')).toBe(2)
    expect(rovingIndex('ArrowDown', 1, 3, 'vertical')).toBe(2)
    expect(rovingIndex('ArrowUp', 0, 3, 'vertical')).toBe(2)
    expect(rovingIndex('ArrowDown', 1, 3, 'horizontal')).toBeNull()
  })

  it('jumps to the ends, and ignores other keys or an empty group', () => {
    expect(rovingIndex('Home', 2, 3, 'horizontal')).toBe(0)
    expect(rovingIndex('End', 0, 3, 'vertical')).toBe(2)
    expect(rovingIndex('a', 0, 3, 'horizontal')).toBeNull()
    expect(rovingIndex('ArrowRight', 0, 0, 'horizontal')).toBeNull()
  })

  it('starts on the first or the last control when none has the focus yet', () => {
    expect(rovingIndex('ArrowDown', -1, 3, 'vertical')).toBe(0)
    expect(rovingIndex('ArrowUp', -1, 3, 'vertical')).toBe(2)
    expect(rovingIndex('ArrowLeft', -1, 1, 'horizontal')).toBe(0)
  })
})

describe('pressedWithKeyboard', () => {
  it('tells a click without a pointer (Enter, Space) from a hand’s', () => {
    expect(pressedWithKeyboard({ detail: 0 })).toBe(true)
    expect(pressedWithKeyboard({ detail: 1 })).toBe(false)
  })
})
