'use client'

import React, { useId, useRef, useState } from 'react'

import styles from './Menu.module.css'

export type MenuItem = {
  label: string
  onSelect?: () => void
  // Greyed out and not activatable, e.g. an action not yet available
  disabled?: boolean
  // Tooltip, e.g. "Coming soon" on a disabled action
  hint?: string
  tone?: 'default' | 'danger'
}

type MenuProps = {
  // Accessible name of the trigger button
  label: string
  items: MenuItem[]
  triggerClassName?: string
  children: React.ReactNode
}

// Gap between the trigger and the menu
const OFFSET = 4

/*
 * Floating menu built on the native Popover API: top layer, light dismiss and Escape are
 * provided by the browser. We add placement below the trigger and arrow-key navigation.
 */
export function Menu({ label, items, triggerClassName, children }: MenuProps) {
  const id = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  const enabledItems = () =>
    Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:enabled') ?? [],
    )

  // Aligned below the trigger's right edge, in viewport coordinates
  function place() {
    const trigger = triggerRef.current?.getBoundingClientRect()
    const menu = menuRef.current
    if (!trigger || !menu) return
    menu.style.top = `${trigger.bottom + OFFSET}px`
    menu.style.right = `${window.innerWidth - trigger.right}px`
  }

  const hide = () => menuRef.current?.hidePopover()

  function handleToggle(e: React.ToggleEvent<HTMLDivElement>) {
    const isOpen = e.newState === 'open'
    setOpen(isOpen)
    // The menu is fixed-positioned: close it rather than let it float while scrolling
    if (isOpen) {
      enabledItems()[0]?.focus()
      window.addEventListener('scroll', hide, { capture: true, once: true, passive: true })
    } else {
      window.removeEventListener('scroll', hide, { capture: true })
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
        className={styles.menu}
        onBeforeToggle={(e) => e.newState === 'open' && place()}
        onToggle={handleToggle}
        onKeyDown={handleKeyDown}
      >
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            className={styles.item}
            data-tone={item.tone ?? 'default'}
            disabled={item.disabled}
            title={item.hint}
            onClick={() => {
              hide()
              item.onSelect?.()
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </>
  )
}
