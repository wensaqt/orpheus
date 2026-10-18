// Gap between a trigger and the floating panel it opens
const OFFSET = 4

/*
 * Puts a fixed-positioned floating panel (a menu, a popover) below its trigger, in viewport
 * coordinates, lined up with the trigger's start (left) or end (right) edge
 */
export function placeBelow(
  trigger: Element | null,
  panel: HTMLElement | null,
  align: 'start' | 'end',
) {
  const bounds = trigger?.getBoundingClientRect()
  if (!bounds || !panel) return
  const visibleBottom =
    (window.visualViewport?.offsetTop ?? 0) + (window.visualViewport?.height ?? window.innerHeight)
  panel.style.setProperty(
    '--popover-available-height',
    `${Math.max(0, visibleBottom - bounds.bottom - 2 * OFFSET)}px`,
  )
  panel.style.top = `${bounds.bottom + OFFSET}px`
  if (align === 'start') panel.style.left = `${bounds.left}px`
  else panel.style.right = `${window.innerWidth - bounds.right}px`
}
