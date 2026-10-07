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

import { focusStayedIn } from '../focus'
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
        const first = panelRef.current?.querySelector(FOCUSABLE)
        if (first instanceof HTMLElement) first.focus()
      },
    }),
    [],
  )

  // From the live state, not the event's: toggle events come late (see Menu)
  function handleToggle() {
    const isOpen = panelRef.current?.matches(':popover-open') ?? false
    if (isOpen === open) return
    setOpen(isOpen)
    if (isOpen) return
    // The anchor: back on what opened it (the browser returns the focus there)
    if (focusStayedIn(triggerRef.current, anchor?.current, panelRef.current)) onCloseInPlace?.()
  }

  function handleBeforeToggle(event: ToggleEvent<HTMLDivElement>) {
    if (event.newState !== 'open') return
    placeBelow(triggerRef.current ?? anchor?.current ?? null, panelRef.current, 'start')
  }

  // Pressing it again closes the panel: the focus is in the panel then, not where it was
  function handleTriggerPointerDown() {
    if (!open) onTriggerPointerDown?.()
  }

  return (
    <>
      {trigger && (
        <button
          ref={triggerRef}
          type="button"
          className={triggerClassName}
          popoverTarget={id}
          onPointerDown={handleTriggerPointerDown}
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
        onBeforeToggle={handleBeforeToggle}
        onToggle={handleToggle}
      >
        {children}
      </div>
    </>
  )
}
