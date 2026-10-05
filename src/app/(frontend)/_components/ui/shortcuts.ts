import { IS_APPLE } from 'lexical'
import { useSyncExternalStore } from 'react'

/*
 * A keyboard shortcut, written once for every platform: "Mod" is Cmd on Apple devices and
 * Ctrl elsewhere, e.g. "Mod+Shift+Z"
 */
export type Shortcut = `Mod+${string}`

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
