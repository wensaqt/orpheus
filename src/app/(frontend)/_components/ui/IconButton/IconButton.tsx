import type { ComponentProps, ReactNode } from 'react'

import { classNames } from '@front/_lib/classNames'

import styles from './IconButton.module.css'

type IconButtonProps = Omit<ComponentProps<'button'>, 'aria-label' | 'title' | 'children'> & {
  // Accessible name, also shown as the tooltip
  label: string
  // What the tooltip shows instead, e.g. the label with its shortcut
  tooltip?: string
  icon: ReactNode
}

/*
 * A small, discreet button showing only an icon. Its label appears in a tooltip on hover and
 * on keyboard focus (the native title tooltip is slow and unstyled).
 */
export function IconButton({ label, tooltip, icon, className, ...button }: IconButtonProps) {
  return (
    <button
      type="button"
      {...button}
      aria-label={label}
      className={classNames(styles.button, className)}
    >
      {icon}
      {/* The label is already the button's name: the tooltip is for sighted users only */}
      <span className={styles.tooltip} aria-hidden="true">
        {tooltip ?? label}
      </span>
    </button>
  )
}
