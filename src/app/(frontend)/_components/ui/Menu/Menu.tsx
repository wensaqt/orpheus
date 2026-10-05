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
  // An option on its own (bold) or one choice among several (a language), on or not
  kind?: 'checkbox' | 'radio'
  checked?: boolean
  // Shown at the item's end, e.g. ⌘B
  shortcut?: Shortcut
  // Decorative mark before the label (an emoji, a symbol), hidden from screen readers
  icon?: string
  // Language of the label, when it differs from the page's ("Français" on an English page)
  lang?: string
}

// A hairline between groups of items
export const MENU_SEPARATOR = 'separator'
// Items that belong together, e.g. one set of radios among others, named for screen readers
export type MenuGroup = { group: string; items: MenuItem[] }
export type MenuEntry = MenuItem | MenuGroup | typeof MENU_SEPARATOR

// Which item takes the focus once the menu opens
type OpenAt = 'first' | 'last'

// Opens the menu from elsewhere, e.g. a keyboard shortcut on the element it belongs to
export type MenuHandle = { open: (at?: OpenAt) => void }

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
  children,
}: MenuProps) {
  const id = useId()
  const apple = useIsApple()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const openAt = useRef<OpenAt>('first')

  // Disabled ones too: they stay in reach of the keyboard
  const menuItems = () =>
    Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>(ITEM_SELECTOR) ?? [])

  const hide = () => menuRef.current?.hidePopover()

  const show = (at: OpenAt = 'first') => {
    openAt.current = at
    menuRef.current?.showPopover()
  }

  useImperativeHandle(ref, () => ({ open: show }), [])

  function handleToggle(e: React.ToggleEvent<HTMLDivElement>) {
    const isOpen = e.newState === 'open'
    setOpen(isOpen)
    // The menu is fixed-positioned: close it rather than let it float while scrolling
    if (isOpen) {
      menuItems()
        .at(openAt.current === 'last' ? -1 : 0)
        ?.focus()
      openAt.current = 'first'
      window.addEventListener('scroll', hide, { capture: true, once: true, passive: true })
      return
    }
    window.removeEventListener('scroll', hide, { capture: true })
    const active = document.activeElement
    const inPlace =
      active === document.body ||
      active === triggerRef.current ||
      Boolean(menuRef.current?.contains(active))
    if (inPlace) onCloseInPlace?.()
    onClose?.()
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

  const renderItem = (item: MenuItem) => (
    <button
      key={item.label}
      type="button"
      role={item.kind ? ROLES[item.kind] : 'menuitem'}
      aria-checked={item.kind ? Boolean(item.checked) : undefined}
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
        // Pressing it again closes the menu: the focus is in the menu then, not where it was
        onPointerDown={() => !open && onTriggerPointerDown?.()}
        onClick={(e) => {
          // A cancelled click does not toggle the menu
          if (disabled) e.preventDefault()
          triggerProps?.onClick?.(e)
        }}
        onKeyDown={(e) => {
          triggerProps?.onKeyDown?.(e)
          const at = OPENING_KEYS[e.key]
          if (!at || disabled || open || e.defaultPrevented) return
          e.preventDefault()
          show(at)
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
