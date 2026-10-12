import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const load = vi.fn()
const draw = vi.fn()
const createPicker = vi.fn()
vi.doMock('opensheetmusicdisplay', () => ({
  OpenSheetMusicDisplay: class {
    load = load
    render = draw
  },
}))
vi.doMock('@front/_components/scores/scoreNotePicking', () => ({ createNotePicker: createPicker }))
const { ScoreRenderer } = await import('@front/_components/scores/ScoreRenderer')

afterEach(cleanup)

beforeEach(() => {
  load.mockReset()
  draw.mockReset()
  createPicker.mockReset().mockReturnValue(null)
})

it('reports a render failure and becomes ready only after the next successful render', async () => {
  load.mockResolvedValue(undefined)
  draw.mockImplementationOnce(() => {
    throw new Error('Invalid notation')
  })
  const report = vi.fn()
  const { rerender } = render(<ScoreRenderer xml="first" onRenderState={report} />)
  await waitFor(() => expect(report).toHaveBeenLastCalledWith({ xml: 'first', status: 'error' }))
  expect(report).not.toHaveBeenCalledWith({ xml: 'first', status: 'ready' })
  rerender(<ScoreRenderer xml="second" onRenderState={report} />)
  await waitFor(() => expect(report).toHaveBeenLastCalledWith({ xml: 'second', status: 'ready' }))
})

it('ignores completion of a superseded render', async () => {
  let finish!: () => void
  load.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve
      }),
  )
  load.mockResolvedValue(undefined)
  const report = vi.fn()
  const { rerender } = render(<ScoreRenderer xml="first" onRenderState={report} />)
  await waitFor(() => expect(load).toHaveBeenCalledOnce())
  rerender(<ScoreRenderer xml="second" onRenderState={report} />)
  await waitFor(() => expect(report).toHaveBeenLastCalledWith({ xml: 'second', status: 'ready' }))
  finish()
  await Promise.resolve()
  expect(report).not.toHaveBeenCalledWith({ xml: 'first', status: 'ready' })
  expect(draw).toHaveBeenCalledOnce()
})

it('uses the current click handler when it changes during or after loading', async () => {
  let finish!: () => void
  load.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve
      }),
  )
  createPicker.mockReturnValue(() => 2)
  const oldClick = vi.fn()
  const newClick = vi.fn()
  const { container, rerender } = render(<ScoreRenderer xml="first" onNoteClick={oldClick} />)
  await waitFor(() => expect(load).toHaveBeenCalledOnce())
  rerender(<ScoreRenderer xml="first" onNoteClick={newClick} />)
  expect(container.querySelector('[data-selectable]')).toBeNull()
  await act(async () => finish())
  fireEvent.click(container.querySelector('[data-selectable]')!)
  expect(oldClick).not.toHaveBeenCalled()
  expect(newClick).toHaveBeenCalledWith(2)
  rerender(<ScoreRenderer xml="first" />)
  expect(container.querySelector('[data-selectable]')).toBeNull()
  fireEvent.click(container.firstElementChild!)
  expect(newClick).toHaveBeenCalledOnce()
  expect(load).toHaveBeenCalledOnce()
})

it('does not reuse a previous XML picker while the next score loads', async () => {
  load.mockResolvedValueOnce(undefined)
  createPicker.mockReturnValue(() => 2)
  const click = vi.fn()
  const { container, rerender } = render(<ScoreRenderer xml="first" onNoteClick={click} />)
  await waitFor(() => expect(container.querySelector('[data-selectable]')).not.toBeNull())
  let finish!: () => void
  load.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve
      }),
  )
  rerender(<ScoreRenderer xml="second" onNoteClick={click} />)
  await waitFor(() => expect(load).toHaveBeenCalledTimes(2))
  expect(container.querySelector('[data-selectable]')).toBeNull()
  fireEvent.click(container.firstElementChild!)
  expect(click).not.toHaveBeenCalled()
  createPicker.mockReturnValue(null)
  await act(async () => finish())
  expect(container.querySelector('[data-selectable]')).toBeNull()
})
