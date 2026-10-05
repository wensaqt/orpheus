'use client'

import {
  type ReactNode,
  type Ref,
  type RefObject,
  type ToggleEvent,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'

import { placeBelow } from '../placeBelow'
import styles from './Popover.module.css'

// Opens the panel from elsewhere (a menu's item), its first control focused
export type PopoverHandle = { open: () => void }

// The controls of a panel; of a radio group, only its checked radio takes the focus
const FOCUSABLE = 'input:not([type="radio"]), input:checked, select, textarea, button'

type PopoverProps = {
  ref?: Ref<PopoverHandle>
  // Accessible name of the panel (the trigger's own content names the trigger)
  label: string
  // What the trigger button shows; without one, the panel opens through the ref, below `anchor`
  trigger?: ReactNode
  anchor?: RefObject<Element | null>
  triggerClassName?: string
  // Pressed on the trigger, before it takes the focus: to remember where the focus was
  onTriggerPointerDown?: () => void
  // Closed with the focus still in the panel or on its trigger (not moved elsewhere by a click)
  onCloseInPlace?: () => void
  children: ReactNode
}

/*
 * A panel of controls (fields, choices) opened from a button, on the native Popover API like
 * Menu: top layer, light dismiss and Escape come from the browser. It opens below the
 * trigger's left edge. Unlike Menu it stays open while the page scrolls: its triggers sit in
 * the editor's sticky header, which does not move.
 */
export function Popover({
  ref,
  label,
  anchor,
  trigger,
  triggerClassName,
  onTriggerPointerDown,
  onCloseInPlace,
  children,
}: PopoverProps) {
  const id = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  useImperativeHandle(
    ref,
    () => ({
      open: () => {
        panelRef.current?.showPopover()
        panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus()
      },
    }),
    [],
  )

  function handleToggle(event: ToggleEvent<HTMLDivElement>) {
    const isOpen = event.newState === 'open'
    setOpen(isOpen)
    if (isOpen) return
    const active = document.activeElement
    const inPlace =
      active === document.body ||
      active === triggerRef.current ||
      // Back on what opened it (the browser returns the focus there)
      Boolean(active && anchor?.current?.contains(active)) ||
      Boolean(panelRef.current?.contains(active))
    if (inPlace) onCloseInPlace?.()
  }

  return (
    <>
      {trigger && (
        <button
          ref={triggerRef}
          type="button"
          className={triggerClassName}
          popoverTarget={id}
          // Pressing it again closes the panel: the focus is in the panel then, not where it was
          onPointerDown={() => !open && onTriggerPointerDown?.()}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          {trigger}
        </button>
      )}
      <div
        ref={panelRef}
        id={id}
        popover="auto"
        role="dialog"
        aria-label={label}
        className={styles.panel}
        onBeforeToggle={(event) =>
          event.newState === 'open' &&
          placeBelow(triggerRef.current ?? anchor?.current ?? null, panelRef.current, 'start')
        }
        onToggle={handleToggle}
      >
        {children}
      </div>
    </>
  )
}
