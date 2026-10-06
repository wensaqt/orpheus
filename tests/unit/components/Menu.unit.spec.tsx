import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { MENU_SEPARATOR } from '@front/_components/ui/Menu/constants'
import { Menu } from '@front/_components/ui/Menu/Menu'

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
          { label: 'Bold', kind: 'checkbox', checked: true },
          { group: 'Alignment', items: [{ label: 'Left', kind: 'radio', checked: false }] },
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

  it('tells a toggle from a choice among several, each set of choices a named group', () => {
    renderMenu()
    const bold = screen.getByRole('menuitemcheckbox', { name: 'Bold', hidden: true })
    expect(bold.getAttribute('aria-checked')).toBe('true')
    const group = screen.getByRole('group', { name: 'Alignment', hidden: true })
    const left = screen.getByRole('menuitemradio', { name: 'Left', hidden: true })
    expect(left.getAttribute('aria-checked')).toBe('false')
    expect(group.contains(left)).toBe(true)
  })

  it('opens from its trigger with the arrows, unless off', () => {
    const showPopover = vi.fn()
    HTMLElement.prototype.showPopover = showPopover
    renderMenu()
    fireEvent.keyDown(screen.getByRole('button', { name: 'File' }), { key: 'ArrowUp' })
    expect(showPopover).toHaveBeenCalledOnce()
    cleanup()
    renderMenu({ disabled: true })
    fireEvent.keyDown(screen.getByRole('button', { name: 'File' }), { key: 'ArrowDown' })
    expect(showPopover).toHaveBeenCalledOnce()
  })

  it('takes a role and keys for its trigger, which can be off', () => {
    renderMenu({ triggerProps: { role: 'menuitem', 'data-roving': '' }, disabled: true })
    const trigger = screen.getByRole('menuitem', { name: 'File' })
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu')
    expect(trigger.getAttribute('aria-disabled')).toBe('true')
    expect(trigger.hasAttribute('data-roving')).toBe(true)
  })

  it('removes the scroll listener when closed or unmounted', () => {
    const hide = vi.spyOn(HTMLElement.prototype, 'hidePopover')
    const { unmount } = renderMenu()
    const menu = screen.getByRole('menu', { hidden: true })
    let open = true
    vi.spyOn(menu, 'matches').mockImplementation(() => open)
    fireEvent(menu, new Event('toggle'))
    open = false
    fireEvent(menu, new Event('toggle'))
    fireEvent.scroll(window)
    expect(hide).not.toHaveBeenCalled()
    open = true
    fireEvent(menu, new Event('toggle'))
    unmount()
    fireEvent.scroll(window)
    expect(hide).not.toHaveBeenCalled()
    hide.mockRestore()
  })

  it('closes a scrolling trigger menu and keeps a fixed trigger menu open', () => {
    const hide = vi.spyOn(HTMLElement.prototype, 'hidePopover')
    renderMenu()
    vi.spyOn(screen.getByRole('menu', { hidden: true }), 'matches').mockReturnValue(true)
    fireEvent(screen.getByRole('menu', { hidden: true }), new Event('toggle'))
    fireEvent.scroll(window)
    expect(hide).toHaveBeenCalledOnce()
    cleanup()
    renderMenu({ fixedTrigger: true })
    vi.spyOn(screen.getByRole('menu', { hidden: true }), 'matches').mockReturnValue(true)
    fireEvent(screen.getByRole('menu', { hidden: true }), new Event('toggle'))
    fireEvent.scroll(window)
    expect(hide).toHaveBeenCalledOnce()
    hide.mockRestore()
  })
})
