import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAutosave } from '@front/_hooks/useAutosave'
import { type ActionResult, done, failed } from '@front/_lib/actionResult'

describe('useAutosave', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    // Without Vitest globals, Testing Library does not unmount between tests on its own
    cleanup()
    vi.useRealTimers()
  })

  const ok = () => vi.fn(async (): Promise<ActionResult> => done())
  const setup = (save = ok()) => ({
    save,
    ...renderHook(({ run }) => useAutosave(run), { initialProps: { run: save } }),
  })

  it.each(['session-expired', 'conflict'] as const)(
    'suspends automatic retries for %s while keeping changes pending',
    async (reason) => {
      const save = vi.fn(async (): Promise<ActionResult> => ({ status: 'error', reason }))
      const { result } = setup(save)
      act(() => result.current.queue())
      await act(async () => vi.advanceTimersByTimeAsync(800))
      expect(result.current.failure).toBe(reason)
      act(() => result.current.queue())
      await act(async () => vi.advanceTimersByTimeAsync(60_000))
      expect(save).toHaveBeenCalledOnce()
      let saved = true
      await act(async () => {
        saved = await result.current.flush()
      })
      expect(saved).toBe(false)
      const closing = new Event('beforeunload', { cancelable: true })
      window.dispatchEvent(closing)
      expect(closing.defaultPrevented).toBe(true)
    },
  )

  it('waits for a pause in the changes and saves them once', async () => {
    const { save, result } = setup()
    act(() => result.current.queue())
    act(() => result.current.queue())
    expect(result.current.status).toBe('pending')
    expect(save).not.toHaveBeenCalled()

    await act(async () => vi.advanceTimersByTimeAsync(800))
    expect(save).toHaveBeenCalledTimes(1)
    expect(result.current.status).toBe('saved')
  })

  it('flush sends at once and tells whether it worked; nothing pending is a success', async () => {
    const { save, result } = setup()
    let nothingToSave: boolean | undefined
    await act(async () => {
      nothingToSave = await result.current.flush()
    })
    expect(nothingToSave).toBe(true)
    expect(save).not.toHaveBeenCalled()
    act(() => result.current.queue())
    let saved: boolean | undefined
    await act(async () => {
      saved = await result.current.flush()
    })
    expect(saved).toBe(true)
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('keeps a navigation flush pending until edits made during its request are saved', async () => {
    const requests: ((value: ActionResult) => void)[] = []
    const save = vi.fn(() => new Promise<ActionResult>((resolve) => requests.push(resolve)))
    const { result } = setup(save)
    let finished = false
    act(() => result.current.queue())
    const leaving = result.current.flush().then((saved) => {
      finished = saved
    })
    await act(async () => vi.advanceTimersByTimeAsync(0))
    act(() => result.current.queue())
    await act(async () => requests[0](done()))
    expect(save).toHaveBeenCalledTimes(2)
    expect(finished).toBe(false)
    await act(async () => {
      requests[1](done())
      await leaving
    })
    expect(finished).toBe(true)
    expect(result.current.status).toBe('saved')
  })

  it('calls the latest save while its controls keep their identity', async () => {
    const { result, rerender } = setup()
    const { flush, queue, cancel } = result.current
    const latest = ok()
    rerender({ run: latest })
    expect(result.current.flush).toBe(flush)
    expect(result.current.queue).toBe(queue)
    expect(result.current.cancel).toBe(cancel)
    act(() => result.current.queue())
    await act(async () => vi.advanceTimersByTimeAsync(800))
    expect(latest).toHaveBeenCalledTimes(1)
  })

  it('keeps failed changes and tries again on its own after a backoff delay', async () => {
    const save = ok()
    save.mockResolvedValueOnce(failed)
    const { result } = setup(save)

    act(() => result.current.queue())
    let saved: boolean | undefined
    await act(async () => {
      saved = await result.current.flush()
    })
    expect(saved).toBe(false)
    expect(result.current.status).toBe('error')

    await act(async () => vi.advanceTimersByTimeAsync(1_999))
    expect(save).toHaveBeenCalledTimes(1)
    await act(async () => vi.advanceTimersByTimeAsync(1))
    expect(save).toHaveBeenCalledTimes(2)
    expect(result.current.status).toBe('saved')
  })

  it('after a failure, a new change tries again after the usual pause', async () => {
    const save = ok()
    save.mockResolvedValueOnce(failed)
    const { result } = setup(save)
    act(() => result.current.queue())
    await act(async () => vi.advanceTimersByTimeAsync(800))
    expect(result.current.status).toBe('error')

    act(() => result.current.queue())
    // Still reported as failing until the next save works
    expect(result.current.status).toBe('error')
    await act(async () => vi.advanceTimersByTimeAsync(800))
    expect(save).toHaveBeenCalledTimes(2)
    expect(result.current.status).toBe('saved')
  })

  it('treats a thrown error like a refused save', async () => {
    const save = ok()
    save.mockRejectedValueOnce(new Error('offline'))
    const { result } = setup(save)
    act(() => result.current.queue())
    await act(async () => vi.advanceTimersByTimeAsync(800))
    expect(result.current.status).toBe('error')
  })

  it('handles a synchronous throw without poisoning subsequent saves', async () => {
    const save = ok()
    save.mockImplementationOnce(() => {
      throw new Error('serialization failed')
    })
    const { result } = setup(save)
    act(() => result.current.queue())
    await act(async () => {
      expect(await result.current.flush()).toBe(false)
    })
    expect(result.current.status).toBe('error')
    await act(async () => {
      expect(await result.current.flush()).toBe(true)
    })
    expect(save).toHaveBeenCalledTimes(2)
    expect(result.current.status).toBe('saved')
  })

  it('does not reactivate canceled changes when an in-flight save fails', async () => {
    let finish!: (value: ActionResult) => void
    const save = ok()
    save.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    const { result } = setup(save)
    act(() => result.current.queue())
    await act(async () => vi.advanceTimersByTimeAsync(800))
    act(() => result.current.cancel())
    await act(async () => finish(failed))
    expect(result.current.status).toBe('saved')
    await act(async () => vi.advanceTimersByTimeAsync(30_000))
    expect(save).toHaveBeenCalledOnce()
  })

  it('saves new edits after cancellation without reviving the old attempt', async () => {
    let finish!: (value: ActionResult) => void
    const save = ok()
    save.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    const { result } = setup(save)
    act(() => result.current.queue())
    await act(async () => vi.advanceTimersByTimeAsync(800))
    act(() => {
      result.current.cancel()
      result.current.queue()
    })
    await act(async () => finish(failed))
    expect(result.current.status).toBe('pending')
    await act(async () => vi.advanceTimersByTimeAsync(800))
    expect(save).toHaveBeenCalledTimes(2)
    expect(result.current.status).toBe('saved')
  })

  it('serializes new edits during a save and preserves their debounce after failure', async () => {
    let finish!: (value: ActionResult) => void
    const save = ok()
    save.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    const { result } = setup(save)
    act(() => result.current.queue())
    await act(async () => vi.advanceTimersByTimeAsync(800))
    act(() => result.current.queue())
    expect(result.current.status).toBe('saving')
    await act(async () => finish(failed))
    await act(async () => vi.advanceTimersByTimeAsync(800))
    expect(save).toHaveBeenCalledTimes(2)
    expect(result.current.status).toBe('saved')
    await act(async () => vi.advanceTimersByTimeAsync(30_000))
    expect(save).toHaveBeenCalledTimes(2)
  })

  it.each([done(), failed])(
    'waits for an in-flight attempt before sending newer edits (%j)',
    async (outcome) => {
      let finish!: (value: ActionResult) => void
      const save = ok()
      save.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve
          }),
      )
      const { result } = setup(save)
      act(() => result.current.queue())
      await act(async () => vi.advanceTimersByTimeAsync(800))
      act(() => result.current.queue())
      await act(async () => vi.advanceTimersByTimeAsync(800))
      expect(save).toHaveBeenCalledOnce()
      await act(async () => finish(outcome))
      expect(save).toHaveBeenCalledTimes(2)
      expect(result.current.status).toBe('saved')
      await act(async () => vi.advanceTimersByTimeAsync(30_000))
      expect(save).toHaveBeenCalledTimes(2)
    },
  )

  it('invalidates already queued flushes on cancel while allowing later edits', async () => {
    let finish!: (value: ActionResult) => void
    const save = ok()
    save.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    const { result } = setup(save)
    act(() => result.current.queue())
    await act(async () => vi.advanceTimersByTimeAsync(800))
    let queued!: Promise<boolean>
    act(() => {
      result.current.queue()
      queued = result.current.flush()
      result.current.cancel()
      result.current.queue()
    })
    await act(async () => {
      finish(failed)
      await queued
    })
    expect(save).toHaveBeenCalledOnce()
    expect(result.current.status).toBe('pending')
    await act(async () => vi.advanceTimersByTimeAsync(800))
    expect(save).toHaveBeenCalledTimes(2)
    expect(result.current.status).toBe('saved')
  })

  it('does not schedule a retry if an in-flight save fails after unmount', async () => {
    let finish!: (value: ActionResult) => void
    const save = ok()
    save.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    const { result, unmount } = setup(save)
    act(() => result.current.queue())
    await act(async () => vi.advanceTimersByTimeAsync(800))
    unmount()
    await act(async () => finish(failed))
    await act(async () => vi.advanceTimersByTimeAsync(30_000))
    expect(save).toHaveBeenCalledTimes(2)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('cancel drops what was not sent', async () => {
    const { save, result } = setup()
    act(() => result.current.queue())
    act(() => result.current.cancel())
    await act(async () => vi.advanceTimersByTimeAsync(800))
    expect(save).not.toHaveBeenCalled()
    expect(result.current.status).toBe('saved')
  })

  it('asks before the tab closes while changes are pending or on their way', async () => {
    let finish: (result: ActionResult) => void = () => {}
    const save = vi.fn(() => new Promise<ActionResult>((resolve) => (finish = resolve)))
    const { result } = setup(save)
    const closing = () => {
      const event = new Event('beforeunload', { cancelable: true })
      window.dispatchEvent(event)
      return event.defaultPrevented
    }
    expect(closing()).toBe(false)
    act(() => result.current.queue())
    expect(closing()).toBe(true)
    await act(async () => vi.advanceTimersByTimeAsync(800))
    expect(save).toHaveBeenCalledTimes(1)
    expect(closing()).toBe(true)
    await act(async () => finish(done()))
    expect(closing()).toBe(false)
  })

  it('sends whatever is still pending when the component unmounts', async () => {
    const { save, result, unmount } = setup()
    act(() => result.current.queue())
    unmount()
    await act(async () => vi.advanceTimersByTimeAsync(0))
    expect(save).toHaveBeenCalledTimes(1)
  })
})
