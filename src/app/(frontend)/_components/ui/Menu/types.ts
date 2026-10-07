import type { ActionTone } from '../types'
import type { Shortcut } from '../shortcuts'
import type { MENU_SEPARATOR } from './constants'

export type MenuItem = {
  label: string
  onSelect?: () => void
  // Greyed out and not activatable, e.g. an action not yet available; still focusable, so
  // the keyboard finds it and its hint
  disabled?: boolean
  // Tooltip, e.g. "Coming soon" on a disabled action
  hint?: string
  tone?: ActionTone
  // An option on its own (bold) or one choice among several (a language), on or not
  kind?: 'checkbox' | 'radio'
  checked?: boolean
  // Shown at the item's end, e.g. ⌘B
  shortcut?: Shortcut
  // Decorative mark before the label (an emoji, a symbol), hidden from screen readers
  icon?: string
  // Language of the label, when it differs from the page's ("Français" on an English page)
  lang?: string
}

// Items that belong together, e.g. one set of radios among others, named for screen readers
export type MenuGroup = { group: string; items: MenuItem[] }
export type MenuEntry = MenuItem | MenuGroup | typeof MENU_SEPARATOR

// Which item takes the focus once the menu opens
export type OpenAt = 'first' | 'last'

// Opens the menu from elsewhere, e.g. a keyboard shortcut on the element it belongs to
export type MenuHandle = { open: (at?: OpenAt) => void }
