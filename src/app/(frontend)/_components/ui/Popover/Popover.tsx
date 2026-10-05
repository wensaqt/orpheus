'use client'

import { type ReactNode, useId, useRef, useState } from 'react'

import styles from './Popover.module.css'

type PopoverProps = {
  // Accessible name of the panel (the trigger's own content names the trigger)
  label: string
  // What the trigger button shows
  trigger: ReactNode
  triggerClassName?: string
  children: ReactNode
}

// Gap between the trigger and the panel
const OFFSET = 4

/*
 * A panel of controls (fields, choices) opened from a button, on the native Popover API like
 * Menu: top layer, light dismiss and Escape come from the browser. It opens below the
 * trigger's left edge.
 */
export function Popover({ label, trigger, triggerClassName, children }: PopoverProps) {
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

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={triggerClassName}
        popoverTarget={id}
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
        onToggle={(event) => setOpen(event.newState === 'open')}
      >
        {children}
      </div>
    </>
  )
}
