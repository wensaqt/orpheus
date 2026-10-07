import { MS_PER_SECOND } from './time'
import type { Locale } from './i18n'

const MINUTE = 60
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY

/*
 * Date formatters for one language. Intl formatters are expensive to build, so they are created
 * once per language and reused.
 */
function createFormatters(locale: Locale) {
  const dateTime = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' })
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

  return {
    // Readable date and time, e.g. "Sep 30, 2026, 10:42 AM"
    formatDateTime: (value: Date | string) => dateTime.format(new Date(value)),

    // Relative while recent ("now", "2 hours ago", "yesterday"), then the date
    formatRelative(value: Date | string, now: Date = new Date()) {
      const target = new Date(value)
      const seconds = (target.getTime() - now.getTime()) / MS_PER_SECOND
      const elapsed = Math.abs(seconds)

      if (elapsed < MINUTE) return relative.format(0, 'second')
      if (elapsed < HOUR) return relative.format(Math.round(seconds / MINUTE), 'minute')
      if (elapsed < DAY) return relative.format(Math.round(seconds / HOUR), 'hour')
      if (elapsed < WEEK) return relative.format(Math.round(seconds / DAY), 'day')
      return date.format(target)
    },
  }
}

const formattersByLocale = new Map<Locale, ReturnType<typeof createFormatters>>()

export function getFormatters(locale: Locale) {
  let formatters = formattersByLocale.get(locale)
  if (!formatters) {
    formatters = createFormatters(locale)
    formattersByLocale.set(locale, formatters)
  }
  return formatters
}
