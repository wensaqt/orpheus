'use client'

import React, {
  type ComponentProps,
  type Ref,
  useId,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'

import { classNames } from '@front/_lib/classNames'

import { focusStayedIn } from '../focus'
import { placeBelow } from '../placeBelow'
import surfaceStyles from '../popoverSurface.module.css'
import { rovingIndex } from '../rovingFocus'
import { ariaShortcut, shortcutLabel, useIsApple } from '../shortcuts'
import { MENU_SEPARATOR } from './constants'
import styles from './Menu.module.css'
import type { MenuEntry, MenuHandle, MenuItem, OpenAt } from './types'

const ROLES = { checkbox: 'menuitemcheckbox', radio: 'menuitemradio' } as const

// The trigger's keys that open the menu, and where (https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/)
const OPENING_KEYS: Record<string, OpenAt> = { ArrowDown: 'first', ArrowUp: 'last' }

const ITEM_SELECTOR = ':is([role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"])'

type MenuProps = {
  ref?: Ref<MenuHandle>
  // Called once the menu has closed, whatever closed it
  onClose?: () => void
  // Closed with the focus still on the menu or its trigger (Escape, the trigger pressed
  // again), not moved elsewhere by a click or by the next menu of a menu bar
  onCloseInPlace?: () => void
  // Pressed on the trigger to open the menu, before it takes the focus: to remember where the
  // focus was
  onTriggerPointerDown?: () => void
  // Accessible name of the trigger button
  label: string
  // Non-interactive content above the items, e.g. who is signed in
  header?: React.ReactNode
  items: MenuEntry[]
  // Lined up with the trigger's end (a corner menu) or its start (a menu bar's)
  align?: 'start' | 'end'
  triggerClassName?: string
  // For a trigger that belongs to a group (a menu bar): its role, roving marker; a tabIndex of
  // -1 when it sits inside an element that takes the focus itself (a tree row)
  triggerProps?: Omit<
    ComponentProps<'button'>,
    'type' | 'className' | 'aria-label' | 'children' | 'onPointerDown'
  > &
    Partial<Record<`data-${string}`, string>>
  // Left or Right pressed in the open menu, e.g. to open the menu bar's next menu
  onSideKey?: (step: -1 | 1) => void
  // The trigger stays focusable but opens nothing (a toolbar's control with nothing to act on)
  disabled?: boolean
  // The trigger never moves while the page scrolls (it sits in the editor's sticky header):
  // the menu stays open then, rather than closing at the first scroll
  fixedTrigger?: boolean
  children: React.ReactNode
}

/*
 * Floating menu built on the native Popover API: top layer, light dismiss and Escape are
 * provided by the browser. We add placement below the trigger and arrow-key navigation; Down
 * or Up on the trigger opens it on its first or last item.
 */
export function Menu({
  ref,
  onClose,
  onCloseInPlace,
  onTriggerPointerDown,
  label,
  header,
  items,
  align = 'end',
  triggerClassName,
  triggerProps,
  onSideKey,
  disabled,
  fixedTrigger = false,
  children,
}: MenuProps) {
  const id = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const openAt = useRef<OpenAt>('first')

  // Disabled ones too: they stay in reach of the keyboard
  const menuItems = () =>
    Array.from(menuRef.current?.querySelectorAll(ITEM_SELECTOR) ?? []).filter(
      (item) => item instanceof HTMLButtonElement,
    )

  const hide = () => menuRef.current?.hidePopover()

  const show = (at: OpenAt = 'first') => {
    openAt.current = at
    menuRef.current?.showPopover()
  }

  useImperativeHandle(ref, () => ({ open: show }), [])

  useEffect(() => {
    if (!open || fixedTrigger) return
    const closeOnScroll = () => menuRef.current?.hidePopover()
    window.addEventListener('scroll', closeOnScroll, { capture: true, once: true, passive: true })
    return () => window.removeEventListener('scroll', closeOnScroll, { capture: true })
  }, [open, fixedTrigger])

  function handleOpened() {
    menuItems()
      .at(openAt.current === 'last' ? -1 : 0)
      ?.focus()
    openAt.current = 'first'
  }

  function handleClosed() {
    if (focusStayedIn(triggerRef.current, menuRef.current)) onCloseInPlace?.()
    onClose?.()
  }

  /*
   * From the menu's live state, not the event's: toggle events are dispatched late, so after a
   * quick open and close the "opened" one may come once the menu is closed again (and must
   * not focus an item in it). An event that changes nothing is a late one.
   */
  function handleToggle() {
    const isOpen = menuRef.current?.matches(':popover-open') ?? false
    if (isOpen === open) return
    setOpen(isOpen)
    if (isOpen) handleOpened()
    else handleClosed()
  }

  function handleBeforeToggle(event: React.ToggleEvent<HTMLDivElement>) {
    if (event.newState === 'open') placeBelow(triggerRef.current, menuRef.current, align)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (onSideKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      event.preventDefault()
      hide()
      onSideKey(event.key === 'ArrowLeft' ? -1 : 1)
      return
    }
    const focusable = menuItems()
    const current = focusable.findIndex((item) => item === document.activeElement)
    const next = rovingIndex(event.key, current, focusable.length, 'vertical')
    if (next === null) return
    event.preventDefault()
    focusable[next].focus()
  }

  // Pressing it again closes the menu: the focus is in the menu then, not where it was
  function handleTriggerPointerDown() {
    if (!open) onTriggerPointerDown?.()
  }

  function handleTriggerClick(event: React.MouseEvent<HTMLButtonElement>) {
    // A cancelled click does not toggle the menu
    if (disabled) event.preventDefault()
    triggerProps?.onClick?.(event)
  }

  function handleTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    triggerProps?.onKeyDown?.(event)
    const at = OPENING_KEYS[event.key]
    if (!at || disabled || open || event.defaultPrevented) return
    event.preventDefault()
    show(at)
  }

  const renderItem = (item: MenuItem) => (
    <MenuItemButton key={item.label} item={item} onChosen={hide} />
  )

  return (
    <>
      <button
        {...triggerProps}
        ref={triggerRef}
        type="button"
        className={triggerClassName}
        popoverTarget={id}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        aria-disabled={disabled || undefined}
        onPointerDown={handleTriggerPointerDown}
        onClick={handleTriggerClick}
        onKeyDown={handleTriggerKeyDown}
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
        className={classNames(surfaceStyles.surface, styles.menu)}
        onBeforeToggle={handleBeforeToggle}
        onToggle={handleToggle}
        onKeyDown={handleKeyDown}
      >
        {/* Not an item (a menu only holds items): read as the menu's description instead */}
        {header && (
          <div id={`${id}-header`} role="presentation" className={styles.header}>
            {header}
          </div>
        )}
        {items.map((entry, index) =>
          entry === MENU_SEPARATOR ? (
            <div key={`${MENU_SEPARATOR}-${index}`} role="separator" className={styles.separator} />
          ) : 'group' in entry ? (
            <div key={entry.group} role="group" aria-label={entry.group}>
              {entry.items.map(renderItem)}
            </div>
          ) : (
            renderItem(entry)
          ),
        )}
      </div>
    </>
  )
}

// One item: an action, or an option that is on or not
function MenuItemButton({ item, onChosen }: { item: MenuItem; onChosen: () => void }) {
  const apple = useIsApple()

  function handleClick() {
    if (item.disabled) return
    onChosen()
    item.onSelect?.()
  }

  return (
    <button
      type="button"
      role={item.kind ? ROLES[item.kind] : 'menuitem'}
      aria-checked={item.kind ? Boolean(item.checked) : undefined}
      aria-disabled={item.disabled || undefined}
      aria-keyshortcuts={item.shortcut && ariaShortcut(item.shortcut, apple)}
      lang={item.lang}
      className={styles.item}
      data-tone={item.tone ?? 'default'}
      title={item.hint}
      onClick={handleClick}
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
  )
}
