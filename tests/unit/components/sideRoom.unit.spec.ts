import { describe, expect, it } from 'vitest'

import { panelFits } from '@/app/(frontend)/compositions/[id]/_components/sideRoom'

// A4 (794 px) between a 240 px binder and a 272 px synonyms panel, 32 px apart
const desk = { gap: 32, binder: 240, page: 794, panel: 272 }

describe('panelFits', () => {
  it('fits the panel when the three columns and their gaps do', () => {
    expect(panelFits({ ...desk, available: 240 + 32 + 794 + 32 + 272 })).toBe(true)
  })

  it('does not when a laptop is a little short of it', () => {
    expect(panelFits({ ...desk, available: 1248 })).toBe(false)
  })

  it('makes room when the binder is folded to its button', () => {
    expect(panelFits({ ...desk, binder: 28, available: 1248 })).toBe(true)
  })
})
