import { type FocusEvent, type KeyboardEvent, useEffect, useRef } from 'react'

// Marks the controls of a roving group (a toolbar, a menu bar): one tab stop for all of them
export const ROVING_ATTRIBUTE = 'data-roving'
// Spread on such a control
export const ROVING_PROPS = { [ROVING_ATTRIBUTE]: '' } as const

const PREVIOUS = { horizontal: 'ArrowLeft', vertical: 'ArrowUp' } as const
const NEXT = { horizontal: 'ArrowRight', vertical: 'ArrowDown' } as const

/*
 * Where a key moves the focus in a group of `count` controls, from the one at `current` (-1
 * for none yet): the arrows step and wrap around, Home and End jump to the ends. Null for any
 * other key
 */
export function rovingIndex(
  key: string,
  current: number,
  count: number,
  orientation: 'horizontal' | 'vertical',
): number | null {
  if (count === 0) return null
  switch (key) {
    case NEXT[orientation]:
      return (current + 1) % count
    case PREVIOUS[orientation]:
      return current <= 0 ? count - 1 : current - 1
    case 'Home':
      return 0
    case 'End':
      return count - 1
    default:
      return null
  }
}

/*
 * A horizontal group with a single tab stop (https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/):
 * the controls marked with ROVING_ATTRIBUTE, in document order. Tab lands on the last one
 * focused; Left/Right, Home and End move between them; Escape on one calls `onEscape`. Keys
 * pressed elsewhere inside (in an open menu) are left alone.
 */
export function useRovingFocus<T extends HTMLElement>(onEscape?: () => void) {
  const ref = useRef<T>(null)
  const controls = () =>
    Array.from(ref.current?.querySelectorAll<HTMLElement>(`[${ROVING_ATTRIBUTE}]`) ?? [])
  const makeTabStop = (stop: Element | undefined) =>
    controls().forEach((control) => {
      control.tabIndex = control === stop ? 0 : -1
    })

  // The first control is the tab stop until another one takes the focus
  useEffect(() => makeTabStop(controls()[0]), [])

  return {
    ref,
    onFocus: (event: FocusEvent<T>) => {
      if (event.target.hasAttribute(ROVING_ATTRIBUTE)) makeTabStop(event.target)
    },
    onKeyDown: (event: KeyboardEvent<T>) => {
      const all = controls()
      const current = all.indexOf(event.target as HTMLElement)
      if (current === -1) return
      if (event.key === 'Escape' && onEscape) {
        event.preventDefault()
        onEscape()
        return
      }
      const next = rovingIndex(event.key, current, all.length, 'horizontal')
      if (next === null) return
      event.preventDefault()
      all[next].focus()
    },
    // The control at this index of the group, e.g. the menu next to an open one
    controlAt: (index: number) => controls().at(index % controls().length),
  }
}
