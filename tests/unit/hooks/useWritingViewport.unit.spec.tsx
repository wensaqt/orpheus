import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

let root: HTMLDivElement
let screen: HTMLDivElement
let viewport: EventTarget & { height: number; offsetTop: number }
let update: () => void
let pending: FrameRequestCallback | undefined
const unregister = vi.fn()
const editor = {
  getRootElement: () => root,
  isComposing: vi.fn(() => false),
  registerUpdateListener: (listener: () => void) => {
    update = listener
    return unregister
  },
}
vi.doMock('@lexical/react/LexicalComposerContext', () => ({
  useLexicalComposerContext: () => [editor],
}))
const { useWritingViewport } =
  await import('@front/_components/editor/pagination/useWritingViewport')

function flushFrame() {
  act(() => {
    const callback = pending
    pending = undefined
    callback?.(0)
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  editor.isComposing.mockReturnValue(false)
  screen = document.createElement('div')
  screen.dataset.editorScreen = ''
  root = document.createElement('div')
  root.tabIndex = 0
  root.textContent = 'Writing'
  screen.append(root)
  document.body.append(screen)
  root.focus()
  const range = document.createRange()
  range.setStart(root.firstChild!, 3)
  range.collapse(true)
  window.getSelection()!.removeAllRanges()
  window.getSelection()!.addRange(range)
  Object.defineProperty(range, 'getClientRects', {
    value: () => {
      expect(screen.style.getPropertyValue('--visible-viewport-height')).toBe(`${viewport.height}px`)
      return [{ top: 360, bottom: 380, height: 20 }]
    },
  })
  viewport = Object.assign(new EventTarget(), { height: 300, offsetTop: 20 })
  vi.stubGlobal('visualViewport', viewport)
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false })),
  )
  vi.stubGlobal('scrollBy', vi.fn())
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => {
      pending = callback
      return 1
    }),
  )
  vi.stubGlobal(
    'cancelAnimationFrame',
    vi.fn(() => {
      pending = undefined
    }),
  )
})

afterEach(() => {
  cleanup()
  screen.remove()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('updates viewport appearance before measuring the caret and respects the mobile navigator', () => {
  const navigator = document.createElement('nav')
  navigator.dataset.mobileDocumentNavigator = ''
  screen.append(navigator)
  vi.spyOn(navigator, 'getBoundingClientRect').mockReturnValue({ top: 260 } as DOMRect)
  renderHook(() => useWritingViewport(true))
  flushFrame()
  expect(screen.hasAttribute('data-compact-writing')).toBe(true)
  expect(screen.style.getPropertyValue('--visible-viewport-height')).toBe('300px')
  expect(screen.style.getPropertyValue('--visible-viewport-offset-top')).toBe('20px')
  expect(window.scrollBy).toHaveBeenCalledWith(0, 136)
  viewport.height = 600
  viewport.dispatchEvent(new Event('resize'))
  flushFrame()
  expect(screen.hasAttribute('data-compact-writing')).toBe(false)
})

it.each(['composition', 'pointer', 'selection', 'outside focus', 'print'])(
  'leaves native scrolling in charge during %s',
  (reason) => {
    renderHook(() => useWritingViewport(true))
    if (reason === 'composition') editor.isComposing.mockReturnValue(true)
    if (reason === 'pointer') window.dispatchEvent(new Event('pointerdown'))
    if (reason === 'selection') window.getSelection()!.extend(root.firstChild!, 5)
    if (reason === 'outside focus') root.blur()
    if (reason === 'print')
      vi.mocked(window.matchMedia).mockReturnValue({ matches: true } as MediaQueryList)
    flushFrame()
    expect(window.scrollBy).not.toHaveBeenCalled()
    expect(screen.hasAttribute('data-compact-writing')).toBe(true)
  },
)

it('coalesces updates and cancels listeners, pending frames and viewport styling when disabled', () => {
  const { rerender } = renderHook(({ enabled }) => useWritingViewport(enabled), {
    initialProps: { enabled: true },
  })
  flushFrame()
  vi.mocked(window.scrollBy).mockClear()
  update()
  update()
  rerender({ enabled: false })
  expect(pending).toBeUndefined()
  expect(unregister).toHaveBeenCalledOnce()
  expect(screen.hasAttribute('data-compact-writing')).toBe(false)
  expect(screen.style.getPropertyValue('--visible-viewport-height')).toBe('')
  expect(screen.style.getPropertyValue('--visible-viewport-offset-top')).toBe('')
  vi.mocked(window.requestAnimationFrame).mockClear()
  viewport.dispatchEvent(new Event('resize'))
  document.dispatchEvent(new Event('selectionchange'))
  flushFrame()
  expect(window.requestAnimationFrame).not.toHaveBeenCalled()
  expect(window.scrollBy).not.toHaveBeenCalled()
})
