import { APP_LOCALE } from './i18n'

// Formatters are created once: they are expensive to build
const dateTimeFormat = new Intl.DateTimeFormat(APP_LOCALE, {
  dateStyle: 'medium',
  timeStyle: 'short',
})
const dateFormat = new Intl.DateTimeFormat(APP_LOCALE, { dateStyle: 'medium' })
const relativeFormat = new Intl.RelativeTimeFormat(APP_LOCALE, { numeric: 'auto' })

const MINUTE = 60
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY

// Readable date and time, e.g. "Sep 30, 2026, 10:42 AM"
export const formatDateTime = (date: Date | string) => dateTimeFormat.format(new Date(date))

// Relative while recent ("now", "2 hours ago", "yesterday"), then the date
export function formatRelative(date: Date | string, now: Date = new Date()) {
  const target = new Date(date)
  const seconds = (target.getTime() - now.getTime()) / 1000
  const elapsed = Math.abs(seconds)

  if (elapsed < MINUTE) return relativeFormat.format(0, 'second')
  if (elapsed < HOUR) return relativeFormat.format(Math.round(seconds / MINUTE), 'minute')
  if (elapsed < DAY) return relativeFormat.format(Math.round(seconds / HOUR), 'hour')
  if (elapsed < WEEK) return relativeFormat.format(Math.round(seconds / DAY), 'day')
  return dateFormat.format(target)
}
