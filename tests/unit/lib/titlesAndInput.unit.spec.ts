import { describe, expect, it } from 'vitest'

import { cleanTitle } from '@/lib/titles'

import { isKind, isMove, isParent } from '@front/_features/binder/validation'
import { isId, parseId } from '@front/_lib/validation'

describe('cleanTitle', () => {
  it('trims a title and refuses an empty, overlong or non-text one', () => {
    expect(cleanTitle('  Chant  ', 10)).toBe('Chant')
    expect(cleanTitle('   ', 10)).toBeNull()
    expect(cleanTitle('x'.repeat(11), 10)).toBeNull()
    expect(cleanTitle(42, 10)).toBeNull()
  })
})

describe('binder action input', () => {
  it('accepts positive integer ids only', () => {
    expect([isId(1), isId(0), isId(-3), isId(1.5), isId('1'), isId(Number.NaN)]).toEqual([
      true,
      false,
      false,
      false,
      false,
      false,
    ])
  })

  it('reads an id from a route segment, or null', () => {
    expect([parseId('12'), parseId('0'), parseId('abc'), parseId('1.5'), parseId('')]).toEqual([
      12,
      null,
      null,
      null,
      null,
    ])
  })

  it('accepts a folder id or null as parent, and known kinds', () => {
    expect([isParent(null), isParent(4), isParent(undefined), isParent('4')]).toEqual([
      true,
      true,
      false,
      false,
    ])
    expect([isKind('folder'), isKind('document'), isKind('chapter')]).toEqual([true, true, false])
  })

  it('accepts a move to a parent at a non-negative integer index', () => {
    expect(isMove({ parent: null, index: 0 })).toBe(true)
    expect(isMove({ parent: 3, index: 2 })).toBe(true)
    for (const move of [
      null,
      { parent: null },
      { parent: null, index: -1 },
      { parent: null, index: Number.NaN },
      { parent: null, index: '1' },
      { parent: 'x', index: 0 },
    ]) {
      expect(isMove(move)).toBe(false)
    }
  })
})
