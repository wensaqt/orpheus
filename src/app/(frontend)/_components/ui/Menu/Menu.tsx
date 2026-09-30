'use client'

import React, { useId, useRef, useState } from 'react'

import styles from './Menu.module.css'

export type MenuItem = {
  label: string
  onSelect?: () => void
  // Grisé et non activable, par ex. une action pas encore disponible
  disabled?: boolean
  // Info-bulle, par ex. « Coming soon » sur une action grisée
  hint?: string
  tone?: 'default' | 'danger'
}

type MenuProps = {
  // Nom accessible du bouton déclencheur
  label: string
  items: MenuItem[]
  triggerClassName?: string
  children: React.ReactNode
}

// Écart entre le déclencheur et le menu
const OFFSET = 4

/*
 * Menu flottant sur l'API Popover native : couche supérieure, fermeture au clic extérieur et à
 * Échap fournies par le navigateur. On y ajoute le placement sous le déclencheur et les flèches.
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

  // Aligné sous le bord droit du déclencheur, en coordonnées de la fenêtre
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
    // Le menu est positionné en fixe : on le ferme plutôt que de le laisser flotter au défilement
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
