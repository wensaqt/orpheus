/*
 * Joins a component's own class with the ones it is given. An absent or false entry (an
 * optional `className` prop, a `condition && styles.x`) is skipped: joined as is, undefined
 * would leave a stray space and false would become a "false" class.
 */
export function classNames(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(' ')
}
