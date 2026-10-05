'use client'

import { type ReactNode, type ToggleEvent, useId, useRef, useState } from 'react'

import styles from './Popover.module.css'

type PopoverProps = {
  // Accessible name of the panel (the trigger's own content names the trigger)
  label: string
  // What the trigger button shows
  trigger: ReactNode
  triggerClassName?: string
  // Pressed on the trigger, before it takes the focus: to remember where the focus was
  onTriggerPointerDown?: () => void
  // Closed with the focus still in the panel or on its trigger (not moved elsewhere by a click)
  onCloseInPlace?: () => void
  children: ReactNode
}

// Gap between the trigger and the panel
const OFFSET = 4

/*
 * A panel of controls (fields, choices) opened from a button, on the native Popover API like
 * Menu: top layer, light dismiss and Escape come from the browser. It opens below the
 * trigger's left edge.
 */
export function Popover({
  label,
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

  function place() {
    const bounds = triggerRef.current?.getBoundingClientRect()
    const panel = panelRef.current
    if (!bounds || !panel) return
    panel.style.top = `${bounds.bottom + OFFSET}px`
    panel.style.left = `${bounds.left}px`
  }

  function handleToggle(event: ToggleEvent<HTMLDivElement>) {
    const isOpen = event.newState === 'open'
    setOpen(isOpen)
    if (isOpen) return
    const active = document.activeElement
    const inPlace =
      !active ||
      active === document.body ||
      active === triggerRef.current ||
      Boolean(panelRef.current?.contains(active))
    if (inPlace) onCloseInPlace?.()
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={triggerClassName}
        popoverTarget={id}
        onPointerDown={onTriggerPointerDown}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {trigger}
      </button>
      <div
        ref={panelRef}
        id={id}
        popover="auto"
        role="dialog"
        aria-label={label}
        className={styles.panel}
        onBeforeToggle={(event) => event.newState === 'open' && place()}
        onToggle={handleToggle}
      >
        {children}
      </div>
    </>
  )
}
