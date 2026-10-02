import type { ComponentProps } from 'react'

import styles from './TitleInput.module.css'

type TitleInputProps = Omit<ComponentProps<'input'>, 'size'> & {
  // xl: a document's title above the sheet; lg: a smaller heading (the binder's)
  size?: 'lg' | 'xl'
  // A short rule under the title, drawn across while editing
  ruled?: boolean
}

// Frameless title: it reads as a heading and is edited in place
export function TitleInput({ size = 'xl', ruled = false, className, ...input }: TitleInputProps) {
  return (
    <input
      {...input}
      data-size={size}
      data-ruled={ruled}
      className={[styles.title, className].filter(Boolean).join(' ')}
    />
  )
}
