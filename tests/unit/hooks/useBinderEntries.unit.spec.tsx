import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import type { BinderEntry } from '@front/_features/binder/types'
import { done, failed, type ActionResult } from '@front/_lib/actionResult'
import { uuid } from '../../helpers/ids'

const load = vi.fn<(id: string) => Promise<ActionResult<BinderEntry[]>>>()
vi.doMock('@front/_features/binder/actions', () => ({ loadBinderEntries: load }))
const { useBinderEntries } =
  await import('@front/compositions/[id]/_components/binder/state/useBinderEntries')

const entry = (title: string, id = uuid(3)): BinderEntry => ({
  id,
  title,
  kind: 'document',
  parent: null,
  position: 0,
})
function pendingLoad() {
  let resolve!: (value: ActionResult<BinderEntry[]>) => void
  const promise = new Promise<ActionResult<BinderEntry[]>>((done) => {
    resolve = done
  })
  return { promise, resolve }
}
beforeEach(() => {
  load.mockReset()
})
afterEach(cleanup)

it('keeps local edits when the initial refresh arrives later', async () => {
  const pending = pendingLoad()
  load.mockReturnValue(pending.promise)
  const { result } = renderHook(() => useBinderEntries(uuid(1), [entry('Initial')], vi.fn()))
  act(() => result.current.apply({ type: 'rename', id: uuid(3), title: 'Local' }))
  await act(async () => pending.resolve(done([entry('Server')])))
  expect(result.current.entries[0].title).toBe('Local')
})

it('resets the local-edit boundary on composition change and ignores the previous response', async () => {
  const first = pendingLoad()
  const second = pendingLoad()
  load.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
  const { result, rerender } = renderHook(
    ({ id, initial }) => useBinderEntries(id, initial, vi.fn()),
    { initialProps: { id: uuid(1), initial: [entry('First')] } },
  )
  const oldApply = result.current.apply
  act(() => oldApply({ type: 'rename', id: uuid(3), title: 'First locally edited' }))
  rerender({ id: uuid(2), initial: [entry('Second initial')] })
  expect(result.current.entries[0].title).toBe('Second initial')
  await act(async () => second.resolve(done([entry('Second refreshed')])))
  expect(result.current.entries[0].title).toBe('Second refreshed')
  await act(async () => first.resolve(done([entry('First outdated')])))
  act(() => oldApply({ type: 'rename', id: uuid(3), title: 'Late first operation' }))
  expect(result.current.entries[0].title).toBe('Second refreshed')
})

it.each(['refused', 'rejected'] as const)(
  'reports a %s refresh while preserving initial entries',
  async (failure) => {
    if (failure === 'refused') load.mockResolvedValue(failed)
    else load.mockRejectedValue(new Error('offline'))
    const report = vi.fn()
    const { result } = renderHook(() => useBinderEntries(uuid(1), [entry('Initial')], report))
    await act(async () => {})
    expect(report).toHaveBeenCalledOnce()
    expect(result.current.entries[0].title).toBe('Initial')
  },
)

it('ignores an obsolete failure after composition change', async () => {
  const pending = pendingLoad()
  load.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(done([entry('Second')]))
  const report = vi.fn()
  const { rerender } = renderHook(({ id }) => useBinderEntries(id, [], report), {
    initialProps: { id: uuid(1) },
  })
  rerender({ id: uuid(2) })
  await act(async () => pending.resolve(failed))
  expect(report).not.toHaveBeenCalled()
})

it('does not report a refresh failure after unmount', async () => {
  const pending = pendingLoad()
  load.mockReturnValue(pending.promise)
  const report = vi.fn()
  const { unmount } = renderHook(() => useBinderEntries(uuid(1), [], report))
  unmount()
  await act(async () => pending.resolve(failed))
  expect(report).not.toHaveBeenCalled()
})
