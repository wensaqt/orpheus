import { act, cleanup, fireEvent, render, renderHook, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { SAMPLE_SCORE } from '@/lib/scores/sample'
import { useScoreTransposition } from '@front/compositions/[id]/_components/score/useScoreTransposition'
import { TranspositionControls } from '@front/compositions/[id]/_components/score/ScoreControls'

afterEach(cleanup)

it('offers piano only as a source and uses that choice for the preview', () => {
  const { result } = renderHook(() => useScoreTransposition(SAMPLE_SCORE, vi.fn(), vi.fn()))
  act(() => result.current.controls.actions.onModeChange('instrument'))
  render(
    <TranspositionControls
      {...result.current.controls}
      availability={{ sourceDeclared: false, hasPreview: false, canApply: false, applying: false }}
    />,
  )
  const source = screen.getByLabelText('Source instrument')
  const target = screen.getByLabelText('Target instrument')
  expect(within(source).getByRole('option', { name: 'Piano' })).toBeTruthy()
  expect(within(target).queryByRole('option', { name: 'Piano' })).toBeNull()
  fireEvent.change(source, { target: { value: 'piano' } })
  expect(result.current.controls.settings.sourceInstrument).toBe('piano')
  act(() => result.current.controls.actions.onPreview())
  expect(result.current.preview).toContain('<chromatic>-2</chromatic>')
})

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
