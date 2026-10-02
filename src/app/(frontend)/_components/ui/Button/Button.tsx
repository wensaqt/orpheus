import type { ComponentProps } from 'react'

import styles from './Button.module.css'

type ButtonProps = ComponentProps<'button'> & {
  // Primary: the main action of a dialog or screen; ghost: the quiet alternative (Cancel)
  variant?: 'primary' | 'ghost'
  tone?: 'default' | 'danger'
}

// Text button in the design system's two styles; an icon can lead the label
export function Button({
  variant = 'primary',
  tone = 'default',
  className,
  type = 'button',
  ...button
}: ButtonProps) {
  return (
    <button
      type={type}
      {...button}
      data-variant={variant}
      data-tone={tone}
      className={[styles.button, className].filter(Boolean).join(' ')}
    />
  )
}
