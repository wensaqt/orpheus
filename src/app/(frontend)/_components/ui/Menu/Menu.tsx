'use client'

import React, {
  type ComponentProps,
  type Ref,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'

import { placeBelow } from '../placeBelow'
import { rovingIndex } from '../rovingFocus'
import { ariaShortcut, type Shortcut, shortcutLabel, useIsApple } from '../shortcuts'
import styles from './Menu.module.css'

export type MenuItem = {
  label: string
  onSelect?: () => void
  // Greyed out and not activatable, e.g. an action not yet available; still focusable, so
  // the keyboard finds it and its hint
  disabled?: boolean
  // Tooltip, e.g. "Coming soon" on a disabled action
  hint?: string
  tone?: 'default' | 'danger'
  // One choice among several (e.g. a language): the item is a radio, checked or not
  checked?: boolean
  // With `checked`, an option on its own (bold) rather than one among several
  toggle?: boolean
  // Shown at the item's end, e.g. ⌘B
  shortcut?: Shortcut
  // Decorative mark before the label (an emoji, a symbol), hidden from screen readers
  icon?: string
  // Language of the label, when it differs from the page's ("Français" on an English page)
  lang?: string
}

// A hairline between groups of items
export const MENU_SEPARATOR = 'separator'
export type MenuEntry = MenuItem | typeof MENU_SEPARATOR

// Opens the menu from elsewhere, e.g. a keyboard shortcut on the element it belongs to
export type MenuHandle = { open: () => void }

const ITEM_SELECTOR = ':is([role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"])'

type MenuProps = {
  ref?: Ref<MenuHandle>
  // Called once the menu has closed, whatever closed it
  onClose?: () => void
  // Accessible name of the trigger button
  label: string
  // Non-interactive content above the items, e.g. who is signed in
  header?: React.ReactNode
  items: MenuEntry[]
  // Lined up with the trigger's end (a corner menu) or its start (a menu bar's)
  align?: 'start' | 'end'
  triggerClassName?: string
  // -1 when the trigger sits inside an element that takes the focus itself (a tree row)
  triggerTabIndex?: number
  // For a trigger that belongs to a group (a menu bar): its role, keys, roving marker
  triggerProps?: Omit<ComponentProps<'button'>, 'type' | 'className' | 'aria-label' | 'children'> &
    Partial<Record<`data-${string}`, string>>
  // Left or Right pressed in the open menu, e.g. to open the menu bar's next menu
  onSideKey?: (step: -1 | 1) => void
  // The trigger stays focusable but opens nothing (a toolbar's control with nothing to act on)
  disabled?: boolean
  children: React.ReactNode
}

/*
 * Floating menu built on the native Popover API: top layer, light dismiss and Escape are
 * provided by the browser. We add placement below the trigger and arrow-key navigation.
 */
export function Menu({
  ref,
  onClose,
  label,
  header,
  items,
  align = 'end',
  triggerClassName,
  triggerTabIndex,
  triggerProps,
  onSideKey,
  disabled,
  children,
}: MenuProps) {
  const id = useId()
  const apple = useIsApple()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  // Disabled ones too: they stay in reach of the keyboard
  const menuItems = () =>
    Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>(ITEM_SELECTOR) ?? [])

  const hide = () => menuRef.current?.hidePopover()

  useImperativeHandle(ref, () => ({ open: () => menuRef.current?.showPopover() }), [])

  function handleToggle(e: React.ToggleEvent<HTMLDivElement>) {
    const isOpen = e.newState === 'open'
    setOpen(isOpen)
    // The menu is fixed-positioned: close it rather than let it float while scrolling
    if (isOpen) {
      menuItems()[0]?.focus()
      window.addEventListener('scroll', hide, { capture: true, once: true, passive: true })
    } else {
      window.removeEventListener('scroll', hide, { capture: true })
      onClose?.()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (onSideKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault()
      hide()
      onSideKey(e.key === 'ArrowLeft' ? -1 : 1)
      return
    }
    const focusable = menuItems()
    const current = focusable.indexOf(document.activeElement as HTMLButtonElement)
    const next = rovingIndex(e.key, current, focusable.length, 'vertical')
    if (next === null) return
    e.preventDefault()
    focusable[next].focus()
  }

  const role = (item: MenuItem) =>
    item.checked === undefined ? 'menuitem' : item.toggle ? 'menuitemcheckbox' : 'menuitemradio'

  return (
    <>
      <button
        {...triggerProps}
        ref={triggerRef}
        type="button"
        className={triggerClassName}
        tabIndex={triggerTabIndex}
        popoverTarget={id}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        aria-disabled={disabled || undefined}
        onClick={(e) => {
          // A cancelled click does not toggle the menu
          if (disabled) e.preventDefault()
          triggerProps?.onClick?.(e)
        }}
      >
        {children}
      </button>
      <div
        ref={menuRef}
        id={id}
        popover="auto"
        role="menu"
        aria-label={label}
        aria-describedby={header ? `${id}-header` : undefined}
        className={styles.menu}
        onBeforeToggle={(e) =>
          e.newState === 'open' && placeBelow(triggerRef.current, menuRef.current, align)
        }
        onToggle={handleToggle}
        onKeyDown={handleKeyDown}
      >
        {/* Not an item (a menu only holds items): read as the menu's description instead */}
        {header && (
          <div id={`${id}-header`} role="presentation" className={styles.header}>
            {header}
          </div>
        )}
        {items.map((item, index) =>
          item === MENU_SEPARATOR ? (
            <div key={`${MENU_SEPARATOR}-${index}`} role="separator" className={styles.separator} />
          ) : (
            <button
              key={item.label}
              type="button"
              role={role(item)}
              aria-checked={item.checked}
              aria-disabled={item.disabled || undefined}
              aria-keyshortcuts={item.shortcut && ariaShortcut(item.shortcut, apple)}
              lang={item.lang}
              className={styles.item}
              data-tone={item.tone ?? 'default'}
              title={item.hint}
              onClick={() => {
                if (item.disabled) return
                hide()
                item.onSelect?.()
              }}
            >
              {item.icon && (
                <span className={styles.icon} aria-hidden="true">
                  {item.icon}
                </span>
              )}
              {item.label}
              {item.shortcut && (
                <span className={styles.shortcut} aria-hidden="true">
                  {shortcutLabel(item.shortcut, apple)}
                </span>
              )}
            </button>
          ),
        )}
      </div>
    </>
  )
}
