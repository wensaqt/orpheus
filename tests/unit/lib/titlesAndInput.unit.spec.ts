import { describe, expect, it } from 'vitest'

import { isId } from '@/lib/ids'
import { cleanTitle } from '@/lib/titles'

import { isKind, isMove, isParent } from '@front/_features/binder/validation'
import { parseId } from '@front/_lib/validation'

import { uuid } from '../../helpers/ids'

describe('cleanTitle', () => {
  it('trims a title and refuses an empty, overlong or non-text one', () => {
    expect(cleanTitle('  Chant  ', 10)).toBe('Chant')
    expect(cleanTitle('   ', 10)).toBeNull()
    expect(cleanTitle('x'.repeat(11), 10)).toBeNull()
    expect(cleanTitle(42, 10)).toBeNull()
  })
})

describe('binder action input', () => {
  it('accepts UUIDs only', () => {
    expect(isId(uuid(1))).toBe(true)
    expect(isId('0190f5e8-6a4b-7c3d-9e2f-1a2b3c4d5e6f')).toBe(true)
    for (const value of [1, '1', '', 'not-a-uuid', `${uuid(1)}x`, null, undefined]) {
      expect(isId(value)).toBe(false)
    }
  })

  it('reads an id from a route segment, or null', () => {
    expect(parseId(uuid(12))).toBe(uuid(12))
    for (const segment of ['12', 'abc', '']) expect(parseId(segment)).toBeNull()
  })

  it('accepts a folder id or null as parent, and known kinds', () => {
    expect([isParent(null), isParent(uuid(4)), isParent(undefined), isParent(4)]).toEqual([
      true,
      true,
      false,
      false,
    ])
    expect([isKind('folder'), isKind('document'), isKind('chapter')]).toEqual([true, true, false])
  })

  it('accepts a move to a parent at a non-negative integer index', () => {
    expect(isMove({ parent: null, index: 0 })).toBe(true)
    expect(isMove({ parent: uuid(3), index: 2 })).toBe(true)
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
