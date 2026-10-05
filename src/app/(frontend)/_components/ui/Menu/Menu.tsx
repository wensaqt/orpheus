'use client'

import React, { type Ref, useId, useImperativeHandle, useRef, useState } from 'react'

import { placeBelow } from '../placeBelow'
import styles from './Menu.module.css'

export type MenuItem = {
  label: string
  onSelect?: () => void
  // Greyed out and not activatable, e.g. an action not yet available
  disabled?: boolean
  // Tooltip, e.g. "Coming soon" on a disabled action
  hint?: string
  tone?: 'default' | 'danger'
  // One choice among several (e.g. a language): the item is a radio, checked or not
  checked?: boolean
  // Decorative mark before the label (an emoji, a symbol), hidden from screen readers
  icon?: string
  // Language of the label, when it differs from the page's ("Français" on an English page)
  lang?: string
}

// Opens the menu from elsewhere, e.g. a keyboard shortcut on the element it belongs to
export type MenuHandle = { open: () => void }

type MenuProps = {
  ref?: Ref<MenuHandle>
  // Called once the menu has closed, whatever closed it
  onClose?: () => void
  // Accessible name of the trigger button
  label: string
  // Non-interactive content above the items, e.g. who is signed in
  header?: React.ReactNode
  items: MenuItem[]
  triggerClassName?: string
  // -1 when the trigger sits inside an element that takes the focus itself (a tree row)
  triggerTabIndex?: number
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
  triggerClassName,
  triggerTabIndex,
  children,
}: MenuProps) {
  const id = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  const enabledItems = () =>
    Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>(
        ':is([role="menuitem"], [role="menuitemradio"]):enabled',
      ) ?? [],
    )

  const hide = () => menuRef.current?.hidePopover()

  useImperativeHandle(ref, () => ({ open: () => menuRef.current?.showPopover() }), [])

  function handleToggle(e: React.ToggleEvent<HTMLDivElement>) {
    const isOpen = e.newState === 'open'
    setOpen(isOpen)
    // The menu is fixed-positioned: close it rather than let it float while scrolling
    if (isOpen) {
      enabledItems()[0]?.focus()
      window.addEventListener('scroll', hide, { capture: true, once: true, passive: true })
    } else {
      window.removeEventListener('scroll', hide, { capture: true })
      onClose?.()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const focusable = enabledItems()
    if (!focusable.length) return
    const current = focusable.indexOf(document.activeElement as HTMLButtonElement)
    const next = {
      ArrowDown: (current + 1) % focusable.length,
      ArrowUp: (current - 1 + focusable.length) % focusable.length,
      Home: 0,
      End: focusable.length - 1,
    }[e.key]
    if (next === undefined) return
    e.preventDefault()
    focusable[next].focus()
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={triggerClassName}
        tabIndex={triggerTabIndex}
        popoverTarget={id}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
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
        // Aligned below the trigger's right edge
        onBeforeToggle={(e) =>
          e.newState === 'open' && placeBelow(triggerRef.current, menuRef.current, 'end')
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
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            role={item.checked === undefined ? 'menuitem' : 'menuitemradio'}
            aria-checked={item.checked}
            lang={item.lang}
            className={styles.item}
            data-tone={item.tone ?? 'default'}
            disabled={item.disabled}
            title={item.hint}
            onClick={() => {
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
          </button>
        ))}
      </div>
    </>
  )
}
