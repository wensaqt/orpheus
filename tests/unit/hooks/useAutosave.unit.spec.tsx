import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAutosave } from '@front/_hooks/useAutosave'

type Patch = { title?: string; content?: string }

describe('useAutosave', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const setup = (save = vi.fn(async (_patch: Patch) => undefined)) => ({
    save,
    ...renderHook(() => useAutosave<Patch>(save)),
  })

  it('waits for a pause in typing and batches changes', async () => {
    const { save, result } = setup()
    act(() => result.current.queue({ title: 'Eu' }))
    act(() => result.current.queue({ title: 'Eurydice' }))
    act(() => result.current.queue({ content: 'text' }))
    expect(result.current.status).toBe('pending')
    expect(save).not.toHaveBeenCalled()

    await act(async () => vi.advanceTimersByTimeAsync(800))
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith({ title: 'Eurydice', content: 'text' })
    expect(result.current.status).toBe('saved')
  })

  it('flush sends immediately', async () => {
    const { save, result } = setup()
    act(() => result.current.queue({ title: 'Orpheus' }))
    await act(async () => result.current.flush())
    expect(save).toHaveBeenCalledWith({ title: 'Orpheus' })
  })

  it('on failure, keeps the changes and resends them with the next ones', async () => {
    const save = vi.fn(async (_patch: Patch) => undefined)
    save.mockRejectedValueOnce(new Error('network'))
    const { result } = setup(save)

    act(() => result.current.queue({ title: 'A' }))
    await act(async () => vi.advanceTimersByTimeAsync(800))
    expect(result.current.status).toBe('error')

    act(() => result.current.queue({ content: 'B' }))
    await act(async () => vi.advanceTimersByTimeAsync(800))
    expect(save).toHaveBeenLastCalledWith({ title: 'A', content: 'B' })
    expect(result.current.status).toBe('saved')
  })

  it('sends whatever is still pending when the component unmounts', async () => {
    const { save, result, unmount } = setup()
    act(() => result.current.queue({ content: 'last keystroke' }))
    unmount()
    await act(async () => vi.advanceTimersByTimeAsync(0))
    expect(save).toHaveBeenCalledWith({ content: 'last keystroke' })
  })
})
