import {
  CONTROL_OR_META,
  IS_APPLE,
  isExactShortcutMatch,
  type KeyboardEventModifiers,
} from 'lexical'
import { useSyncExternalStore } from 'react'

/*
 * A keyboard shortcut, written once for every platform: "Mod" is Cmd on Apple devices and
 * Ctrl elsewhere, e.g. "Mod+Shift+Z"
 */
export type Shortcut = `Mod+${string}`

/*
 * Whether a key press is Mod+key and nothing more (Shift or Alt held is another shortcut).
 * Lexical's matcher, as for its own shortcuts: the key is compared case-insensitively as the
 * layout types it (an AZERTY or Dvorak "s"), and by its physical place on non-Latin layouts.
 */
export const isModShortcut = (event: KeyboardEventModifiers, key: string) =>
  isExactShortcutMatch(event, key, CONTROL_OR_META)

export const isModShiftShortcut = (event: KeyboardEventModifiers, key: string) =>
  isExactShortcutMatch(event, key, { ...CONTROL_OR_META, shiftKey: true })

// Apple's symbols, in Apple's order (Shift before Cmd)
const APPLE_KEYS: Record<string, string> = { Shift: '⇧', Alt: '⌥', Mod: '⌘', Enter: '↩' }
const APPLE_ORDER = ['Shift', 'Alt', 'Mod']

// How a shortcut reads in a tooltip or a menu: ⇧⌘Z on a Mac, Ctrl+Shift+Z elsewhere
export function shortcutLabel(shortcut: Shortcut, apple: boolean) {
  const keys = shortcut.split('+')
  if (!apple) return keys.map((key) => (key === 'Mod' ? 'Ctrl' : key)).join('+')
  const rank = (key: string) => {
    const index = APPLE_ORDER.indexOf(key)
    return index === -1 ? APPLE_ORDER.length : index
  }
  return keys
    .sort((a, b) => rank(a) - rank(b))
    .map((key) => APPLE_KEYS[key] ?? key)
    .join('')
}

// The shortcut as aria-keyshortcuts spells it: Meta+Shift+Z, Control+Shift+Z
export const ariaShortcut = (shortcut: Shortcut, apple: boolean) =>
  shortcut.replace('Mod', apple ? 'Meta' : 'Control')

const noSubscription = () => () => {}

/*
 * Whether the writer is on an Apple device. Not known on the server: rendered as elsewhere,
 * then corrected once hydrated, so the markup matches
 */
export const useIsApple = () =>
  useSyncExternalStore(
    noSubscription,
    () => IS_APPLE,
    () => false,
  )
