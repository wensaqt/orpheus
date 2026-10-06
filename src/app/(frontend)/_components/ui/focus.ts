/*
 * Whether the focus stayed with these elements once a panel closed: on one of them, or
 * nowhere (the page itself, as when the focused element went away), not moved elsewhere
 */
export function focusStayedIn(...elements: (Element | null | undefined)[]) {
  const active = document.activeElement
  if (active === document.body) return true
  return elements.some((element) => Boolean(active && element?.contains(active)))
}
