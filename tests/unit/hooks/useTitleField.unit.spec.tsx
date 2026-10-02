import { act, cleanup, renderHook } from '@testing-library/react'
import type { ChangeEvent } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useTitleField } from '@front/_hooks/useTitleField'
import { type ActionResult, done } from '@front/_lib/actionResult'

describe('useTitleField', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  const setup = () => {
    const save = vi.fn(async (_title: string): Promise<ActionResult> => done())
    const onTitle = vi.fn()
    const hook = renderHook(() => useTitleField({ title: 'Orpheus', maxLength: 20, save, onTitle }))
    const type = (value: string) =>
      act(() =>
        hook.result.current.inputProps.onChange({
          target: { value },
        } as ChangeEvent<HTMLInputElement>),
      )
    return { save, onTitle, type, ...hook }
  }

  it('saves the trimmed title after a pause and reports it as typed', async () => {
    const { save, onTitle, type } = setup()
    type('  Eurydice ')
    expect(onTitle).toHaveBeenLastCalledWith('Eurydice')
    await act(async () => vi.advanceTimersByTimeAsync(800))
    expect(save).toHaveBeenCalledWith('Eurydice')
  })

  it('never saves an empty title, and leaving it empty brings back the last one typed', async () => {
    const { save, onTitle, type, result } = setup()
    type('Eurydice')
    type('   ')
    expect(onTitle).toHaveBeenCalledTimes(1)
    await act(async () => result.current.inputProps.onBlur())
    expect(result.current.inputProps.value).toBe('Eurydice')
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith('Eurydice')
  })
})
