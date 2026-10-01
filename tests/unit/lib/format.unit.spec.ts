import { describe, expect, it } from 'vitest'

import { getFormatters } from '@front/_lib/format'

const now = new Date('2026-09-30T12:00:00Z')
const ago = (seconds: number) => new Date(now.getTime() - seconds * 1000)

describe('formatRelative', () => {
  const { formatRelative } = getFormatters('en')

  it.each([
    [10, 'now'],
    [5 * 60, '5 minutes ago'],
    [2 * 3600, '2 hours ago'],
    [24 * 3600, 'yesterday'],
    [3 * 24 * 3600, '3 days ago'],
  ])('%is earlier → "%s"', (seconds, expected) => {
    expect(formatRelative(ago(seconds), now)).toBe(expected)
  })

  it('shows the date beyond one week', () => {
    expect(formatRelative(ago(10 * 24 * 3600), now)).toBe('Sep 20, 2026')
  })

  it('accepts an ISO string (like Payload’s updatedAt)', () => {
    expect(formatRelative(ago(120).toISOString(), now)).toBe('2 minutes ago')
  })

  it('speaks the requested language', () => {
    const french = getFormatters('fr')
    expect(french.formatRelative(ago(24 * 3600), now)).toBe('hier')
    expect(french.formatRelative(ago(10 * 24 * 3600), now)).toBe('20 sept. 2026')
  })

  it('builds the formatters of a language once', () => {
    expect(getFormatters('fr')).toBe(getFormatters('fr'))
  })
})
