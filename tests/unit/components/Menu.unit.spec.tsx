import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Menu, MENU_SEPARATOR } from '@front/_components/ui/Menu/Menu'

// jsdom has no Popover API; the browser's own behaviour is not under test here
HTMLElement.prototype.hidePopover ??= () => {}

describe('Menu', () => {
  const print = vi.fn()
  afterEach(() => {
    cleanup()
    print.mockReset()
  })

  const renderMenu = (props: Partial<Parameters<typeof Menu>[0]> = {}) =>
    render(
      <Menu
        label="File"
        items={[
          { label: 'Print', shortcut: 'Mod+P', onSelect: print },
          MENU_SEPARATOR,
          { label: 'Export', disabled: true, hint: 'Coming soon', onSelect: print },
          { label: 'Bold', checked: true, toggle: true },
        ]}
        {...props}
      >
        File
      </Menu>,
    )

  it('keeps disabled items focusable, saying why, and doing nothing', () => {
    renderMenu()
    const exportItem = screen.getByRole('menuitem', { name: 'Export', hidden: true })
    expect(exportItem.getAttribute('aria-disabled')).toBe('true')
    expect(exportItem.hasAttribute('disabled')).toBe(false)
    expect(exportItem.getAttribute('title')).toBe('Coming soon')
    fireEvent.click(exportItem)
    expect(print).not.toHaveBeenCalled()
  })

  it('shows shortcuts beside the label, out of its name, and separates groups', () => {
    renderMenu()
    const item = screen.getByRole('menuitem', { name: 'Print', hidden: true })
    expect(item.getAttribute('aria-keyshortcuts')).toBe('Control+P')
    expect(item.textContent).toBe('PrintCtrl+P')
    expect(screen.getAllByRole('separator', { hidden: true })).toHaveLength(1)
    fireEvent.click(item)
    expect(print).toHaveBeenCalledOnce()
  })

  it('tells a toggle from a choice among several', () => {
    renderMenu()
    const bold = screen.getByRole('menuitemcheckbox', { name: 'Bold', hidden: true })
    expect(bold.getAttribute('aria-checked')).toBe('true')
  })

  it('takes a role and keys for its trigger, which can be off', () => {
    renderMenu({ triggerProps: { role: 'menuitem', 'data-roving': '' }, disabled: true })
    const trigger = screen.getByRole('menuitem', { name: 'File' })
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu')
    expect(trigger.getAttribute('aria-disabled')).toBe('true')
    expect(trigger.hasAttribute('data-roving')).toBe(true)
  })
})
