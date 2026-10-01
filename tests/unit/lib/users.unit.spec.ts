import { describe, expect, it } from 'vitest'

import { isAdmin, isPro } from '@/lib/users'

describe('users', () => {
  it('tells role and plan apart', () => {
    const proAdmin = { role: 'admin', plan: 'pro' } as const
    const freeAdmin = { role: 'admin', plan: 'free' } as const
    const proUser = { role: 'user', plan: 'pro' } as const
    expect([isAdmin(proAdmin), isPro(proAdmin)]).toEqual([true, true])
    expect([isAdmin(freeAdmin), isPro(freeAdmin)]).toEqual([true, false])
    expect([isAdmin(proUser), isPro(proUser)]).toEqual([false, true])
  })

  it('grants nothing without an account or a value', () => {
    for (const user of [null, undefined, { role: null, plan: null }]) {
      expect([isAdmin(user), isPro(user)]).toEqual([false, false])
    }
  })
})
