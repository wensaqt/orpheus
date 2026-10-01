import { describe, expect, it } from 'vitest'

import { safeReturnTo } from '@front/_lib/returnTo'

describe('safeReturnTo', () => {
  it('keeps a path on this site, with its query', () => {
    expect(safeReturnTo('/compositions/12?view=grid')).toBe('/compositions/12?view=grid')
  })

  it('falls back for anything that could leave the site', () => {
    for (const value of ['https://evil.example', '//evil.example', '/\\evil.example', 'evil']) {
      expect(safeReturnTo(value)).toBe('/')
    }
  })

  it('falls back when the parameter is missing or repeated', () => {
    expect(safeReturnTo(undefined, '/compositions')).toBe('/compositions')
    expect(safeReturnTo(['/a', '/b'])).toBe('/')
  })
})
