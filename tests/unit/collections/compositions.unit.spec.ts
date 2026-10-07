import { describe, expect, it } from 'vitest'
import { uuid } from '../../helpers/ids'

import { isLoggedIn } from '@/access/isLoggedIn'
import { ownedByUser } from '@/access/ownedByUser'
import { setOwnerOnCreate } from '@/collections/Compositions/hooks'
import { validateTitle } from '@/collections/validators'

// Minimal arguments expected by Payload's validators and hooks: the rest of their type unused
const validationArgs = (maxLength?: number) =>
  ({
    maxLength,
    required: true,
    req: { payload: { config: {} }, t: (key: string) => key },
  }) as never

const withUser = (user: { id: string } | null) => ({ req: { user } }) as never

describe('validateTitle', () => {
  it('accepts valid text', () => {
    expect(validateTitle('Eurydice', validationArgs(200))).toBe(true)
  })

  it('rejects a value that is not text', () => {
    // Not text, on purpose
    expect(validateTitle(123 as never, validationArgs(200))).toBe('The title must be text')
    expect(validateTitle({} as never, validationArgs(200))).toBe('The title must be text')
  })

  it('delegates length checks to Payload’s text validator', () => {
    expect(validateTitle('x'.repeat(201), validationArgs(200))).not.toBe(true)
  })
})

describe('compositions access', () => {
  it('restricts creation to logged-in users', () => {
    expect(isLoggedIn(withUser(null))).toBe(false)
    expect(isLoggedIn(withUser({ id: uuid(1) }))).toBe(true)
  })

  it('limits reads to the user’s own compositions', () => {
    expect(ownedByUser(withUser(null))).toBe(false)
    expect(ownedByUser(withUser({ id: uuid(7) }))).toEqual({ owner: { equals: uuid(7) } })
  })
})

describe('setOwnerOnCreate', () => {
  it('forces the author as owner on create, whatever value is sent', () => {
    const data = { title: 'x', owner: uuid(999) }
    const result = setOwnerOnCreate({
      data,
      operation: 'create',
      req: { user: { id: uuid(7) } },
    } as never)
    expect(result).toMatchObject({ owner: uuid(7) })
  })

  it('leaves the owner untouched on update', () => {
    const data = { owner: uuid(999) }
    const result = setOwnerOnCreate({
      data,
      operation: 'update',
      req: { user: { id: uuid(7) } },
    } as never)
    expect(result).toMatchObject({ owner: uuid(999) })
  })
})
