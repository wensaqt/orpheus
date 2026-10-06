import type { MouseEvent } from 'react'

import { useT } from '@front/_components/i18n/I18nProvider'
import { IconButton } from '@front/_components/ui/IconButton/IconButton'
import { ROVING_PROPS } from '@front/_components/ui/rovingFocus'
import {
  ariaShortcut,
  type Shortcut,
  shortcutLabel,
  useIsApple,
} from '@front/_components/ui/shortcuts'

import { pressedWithKeyboard } from './toolbarActions'
import { ToolbarIcon, type ToolbarIconName } from './toolbarIcons'

// A press does not take the focus from the text: the style applies where the writer is
const keepFocus = (event: MouseEvent) => event.preventDefault()

type ToolButtonProps = {
  label: string
  icon: ToolbarIconName
  shortcut?: Shortcut
  // Shown after the label in the tooltip when there is no shortcut, e.g. "Coming soon", and
  // read as the control's description
  hint?: string
  disabled: boolean
  // For a toggle: whether it is on
  pressed?: boolean
  // Pressed; from the keyboard, with the control, which keeps the focus
  onPress?: (control?: HTMLElement) => void
  className?: string
}

/*
 * A control of the style toolbar. Pressing it never takes the writer out of the text: the
 * text keeps the focus under the pointer, and the keyboard leaves it on the control.
 */
export function ToolButton({
  label,
  icon,
  shortcut,
  hint,
  disabled,
  pressed,
  onPress,
  className,
}: ToolButtonProps) {
  const t = useT()
  const apple = useIsApple()
  const detail = shortcut ? shortcutLabel(shortcut, apple) : hint

  // A control pressed with the keyboard keeps the focus; with a pointer, back to the text
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (!disabled) onPress?.(pressedWithKeyboard(event) ? event.currentTarget : undefined)
  }

  return (
    <IconButton
      {...ROVING_PROPS}
      className={className}
      label={label}
      tooltip={detail ? t('editor.labelWithHint', { label, hint: detail }) : label}
      icon={<ToolbarIcon name={icon} />}
      aria-pressed={pressed}
      aria-description={hint}
      aria-disabled={disabled || undefined}
      aria-keyshortcuts={shortcut && ariaShortcut(shortcut, apple)}
      onMouseDown={keepFocus}
      onClick={handleClick}
    />
  )
}
