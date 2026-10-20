import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const load = vi.fn()
const draw = vi.fn()
const createPicker = vi.fn()
const selectNote = vi.fn()
const createMeasureSelection = vi.fn()
const measures = { pick: vi.fn(), select: vi.fn(), anchor: vi.fn(), focus: vi.fn(), count: 4 }
const disconnect = vi.fn()
let resize: ResizeObserverCallback
let frame: FrameRequestCallback | undefined
vi.doMock('opensheetmusicdisplay', () => ({
  OpenSheetMusicDisplay: class {
    load = load
    render = draw
  },
}))
vi.doMock('@front/_components/scores/scoreMeasureSelection', () => ({ createMeasureSelection }))
vi.doMock('@front/_components/scores/scoreNotePicking', () => ({
  createNotePicker: (...args: unknown[]) => {
    const pick = createPicker(...args)
    return pick ? Object.assign(pick, { select: selectNote }) : null
  },
}))
const { ScoreRenderer } = await import('@front/_components/scores/ScoreRenderer')

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

beforeEach(() => {
  createMeasureSelection.mockReset().mockReturnValue(measures)
  Object.values(measures).forEach((value) => {
    if (typeof value === 'function') value.mockReset()
  })
  load.mockReset()
  draw.mockReset()
  createPicker.mockReset().mockReturnValue(null)
  selectNote.mockReset()
  disconnect.mockReset()
  frame = undefined
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(600)
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: ResizeObserverCallback) {
        resize = callback
      }
      observe() {}
      disconnect = disconnect
    },
  )
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frame = callback
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', () => {
    frame = undefined
  })
})

function resizeScore(width: number) {
  act(() => resize([{ contentRect: { width } } as ResizeObserverEntry], {} as ResizeObserver))
}

function flushResize() {
  act(() => {
    const callback = frame
    frame = undefined
    callback?.(0)
  })
}

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

it('reflows the loaded score once per frame and rebuilds selection for the new geometry', async () => {
  load.mockResolvedValue(undefined)
  createPicker.mockReturnValueOnce(() => 2).mockReturnValue(() => 4)
  const click = vi.fn()
  const { container } = render(<ScoreRenderer xml="first" onNoteClick={click} />)
  await waitFor(() => expect(draw).toHaveBeenCalledOnce())
  resizeScore(390)
  resizeScore(320)
  flushResize()
  expect(draw).toHaveBeenCalledTimes(2)
  expect(load).toHaveBeenCalledOnce()
  fireEvent.click(container.querySelector('[data-selectable]')!)
  expect(click).toHaveBeenCalledWith(4)
  resizeScore(320)
  resizeScore(0)
  flushResize()
  expect(draw).toHaveBeenCalledTimes(2)
})

it('cancels pending reflow and disconnects observation when the score changes', async () => {
  load.mockResolvedValue(undefined)
  const { rerender, unmount } = render(<ScoreRenderer xml="first" />)
  await waitFor(() => expect(draw).toHaveBeenCalledOnce())
  resizeScore(320)
  rerender(<ScoreRenderer xml="second" />)
  flushResize()
  await waitFor(() => expect(load).toHaveBeenCalledTimes(2))
  expect(draw).toHaveBeenCalledTimes(2)
  expect(disconnect).toHaveBeenCalledOnce()
  resizeScore(834)
  unmount()
  flushResize()
  expect(draw).toHaveBeenCalledTimes(2)
  expect(disconnect).toHaveBeenCalledTimes(2)
})

it('disables stale selection after a reflow error and recovers on the next width change', async () => {
  load.mockResolvedValue(undefined)
  createPicker.mockReturnValue(() => 2)
  const report = vi.fn()
  const { container } = render(
    <ScoreRenderer xml="first" onNoteClick={vi.fn()} onRenderState={report} />,
  )
  await waitFor(() => expect(container.querySelector('[data-selectable]')).not.toBeNull())
  draw.mockImplementationOnce(() => {
    throw new Error('Layout failed')
  })
  resizeScore(320)
  flushResize()
  expect(container.querySelector('[data-selectable]')).toBeNull()
  expect(report).toHaveBeenLastCalledWith({ xml: 'first', status: 'error' })
  resizeScore(834)
  flushResize()
  expect(container.querySelector('[data-selectable]')).not.toBeNull()
  expect(container.querySelector('[role="alert"]')).toBeNull()
  expect(report).toHaveBeenLastCalledWith({ xml: 'first', status: 'ready' })
  expect(load).toHaveBeenCalledOnce()
})

it('selects the clicked measure before its note and follows the controlled selection without reloading', async () => {
  load.mockResolvedValue(undefined)
  measures.pick.mockReturnValue(2)
  createPicker.mockReturnValue(() => 5)
  const events: string[] = []
  const onMeasureClick = vi.fn((index) => events.push(`measure:${index}`))
  const onNoteClick = vi.fn((index) => events.push(`note:${index}`))
  const { container, rerender } = render(
    <ScoreRenderer
      xml="first"
      onMeasureClick={onMeasureClick}
      onNoteClick={onNoteClick}
      selectedMeasure={1}
    />,
  )
  await waitFor(() => expect(measures.select).toHaveBeenLastCalledWith(1))
  fireEvent.click(container.querySelector('[data-score-renderer]')!)
  expect(events).toEqual(['measure:2', 'note:5'])
  rerender(
    <ScoreRenderer
      xml="first"
      onMeasureClick={onMeasureClick}
      onNoteClick={onNoteClick}
      selectedMeasure={2}
    />,
  )
  await waitFor(() => expect(measures.select).toHaveBeenLastCalledWith(2))
  expect(load).toHaveBeenCalledOnce()
})

it('selects empty measures with the keyboard and focuses the adjacent measure', async () => {
  load.mockResolvedValue(undefined)
  const onMeasureClick = vi.fn()
  const { container } = render(<ScoreRenderer xml="first" onMeasureClick={onMeasureClick} />)
  await waitFor(() => expect(createMeasureSelection).toHaveBeenCalledOnce())
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  rect.dataset.scoreMeasure = '1'
  svg.append(rect)
  container.querySelector('[data-score-renderer]')!.append(svg)
  fireEvent.keyDown(rect, { key: 'Enter' })
  expect(onMeasureClick).toHaveBeenLastCalledWith(1)
  fireEvent.keyDown(rect, { key: 'ArrowRight' })
  expect(onMeasureClick).toHaveBeenLastCalledWith(2)
  expect(measures.focus).toHaveBeenLastCalledWith(2)
})

it('reapplies the controlled note selection after resizing and XML correction, then clears it', async () => {
  load.mockResolvedValue(undefined)
  createPicker.mockImplementation(() => () => 2)
  const { rerender } = render(<ScoreRenderer xml="first" selectedNote={2} />)
  await waitFor(() => expect(selectNote).toHaveBeenLastCalledWith(2))
  resizeScore(320)
  flushResize()
  expect(selectNote).toHaveBeenCalledTimes(2)
  expect(selectNote).toHaveBeenLastCalledWith(2)
  rerender(<ScoreRenderer xml="corrected" selectedNote={2} />)
  await waitFor(() => expect(selectNote).toHaveBeenCalledTimes(3))
  expect(selectNote).toHaveBeenLastCalledWith(2)
  rerender(<ScoreRenderer xml="corrected" selectedNote={null} />)
  expect(selectNote).toHaveBeenLastCalledWith(null)
})
