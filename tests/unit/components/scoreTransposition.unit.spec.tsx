import { act, renderHook } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { SAMPLE_SCORE } from '@/lib/scores/sample'
import { useScoreTransposition } from '@front/compositions/[id]/_components/score/useScoreTransposition'

it('requires a successful render of the current preview before creating a copy', async () => {
  const create = vi.fn().mockResolvedValue(true)
  const { result } = renderHook(() => useScoreTransposition(SAMPLE_SCORE, create, vi.fn()))
  act(() => result.current.controls.actions.onPreview())
  const preview = result.current.preview!
  expect(result.current.canApply).toBe(false)
  act(() => result.current.onRenderState({ xml: preview, status: 'error' }))
  await act(async () => result.current.controls.actions.onApply())
  expect(create).not.toHaveBeenCalled()
  act(() => result.current.onRenderState({ xml: SAMPLE_SCORE, status: 'ready' }))
  expect(result.current.canApply).toBe(false)
  act(() => result.current.onRenderState({ xml: preview, status: 'ready' }))
  expect(result.current.canApply).toBe(true)
  await act(async () => result.current.controls.actions.onApply())
  expect(create).toHaveBeenCalledOnce()
  act(() => result.current.controls.actions.onIntervalChange(2))
  expect(result.current.canApply).toBe(false)
})
