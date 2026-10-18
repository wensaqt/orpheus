import { afterEach, expect, it, vi } from 'vitest'
import {
  bookCaretFromPoint,
  bookCaretTarget,
} from '@front/_components/editor/pagination/caretPlacement'
import type { PagesOnScreen } from '@front/_components/editor/pagination/types'

afterEach(() => vi.restoreAllMocks())

it('keeps clicks on a zoomed right-hand page out of the left-hand text', () => {
  const root = document.createElement('div')
  root.style.width = '220px'
  const editable = document.createElement('div')
  editable.textContent = 'Across two pages'
  root.append(editable)
  vi.spyOn(root, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 0, 440, 300))
  const range = document.createRange()
  vi.spyOn(document, 'createRange').mockReturnValue(range)
  const rectangles = [new DOMRect(120, 80, 120, 20), new DOMRect(340, 30, 120, 20)]
  range.getClientRects = vi.fn().mockReturnValue(
    Object.assign(rectangles, {
      item: (index: number) => rectangles[index] ?? null,
    }),
  )
  const pages: PagesOnScreen = {
    flowTop: 0,
    page: { width: 100, height: 150, top: 0, right: 0, bottom: 0, left: 0 },
    gap: 10,
    pages: 2,
  }
  expect(bookCaretTarget(editable, root, { x: 380, y: 85 }, pages)).toEqual({ x: 456, y: 40 })
  rectangles.pop()
  expect(bookCaretTarget(editable, root, { x: 380, y: 85 }, pages)).toBeNull()
})

it('keeps whitespace after a short line on that line instead of a longer adjacent one', () => {
  const root = document.createElement('div')
  root.style.width = '220px'
  const editable = document.createElement('div')
  editable.textContent = 'A long line followed by a short one'
  root.append(editable)
  vi.spyOn(root, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 220, 150))
  const range = document.createRange()
  vi.spyOn(document, 'createRange').mockReturnValue(range)
  range.getClientRects = vi
    .fn()
    .mockReturnValue([new DOMRect(110, 20, 90, 20), new DOMRect(110, 40, 20, 20)])
  const pages: PagesOnScreen = {
    flowTop: 0,
    page: { width: 100, height: 150, top: 0, right: 0, bottom: 0, left: 0 },
    gap: 10,
    pages: 2,
  }
  expect(bookCaretTarget(editable, root, { x: 190, y: 50 }, pages)).toEqual({ x: 128, y: 50 })
  expect(bookCaretTarget(editable, root, { x: 115, y: 130 }, pages)).toEqual({ x: 128, y: 50 })
  // Formatting splits one visual line into several text rectangles.
  range.getClientRects = vi
    .fn()
    .mockReturnValue([new DOMRect(110, 40, 20, 20), new DOMRect(130, 38, 70, 24)])
  expect(bookCaretTarget(editable, root, { x: 115, y: 130 }, pages)).toEqual({ x: 198, y: 50 })
})

it('rejects a native hit in the left column when the pointer is over the right page', () => {
  const root = document.createElement('div')
  root.style.width = '220px'
  const editable = document.createElement('div')
  editable.textContent = 'Left and right'
  root.append(editable)
  const text = editable.firstChild!
  vi.spyOn(root, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 220, 150))
  const range = document.createRange()
  vi.spyOn(document, 'createRange').mockReturnValue(range)
  range.getClientRects = vi
    .fn()
    .mockReturnValueOnce([new DOMRect(10, 40, 0, 20)])
    .mockReturnValue([new DOMRect(120, 40, 80, 20)])
  const original = document.caretPositionFromPoint
  const hit = vi
    .fn()
    .mockReturnValueOnce({ offsetNode: text, offset: 0 })
    .mockReturnValue({ offsetNode: text, offset: 9 })
  document.caretPositionFromPoint = hit
  try {
    const pages: PagesOnScreen = {
      flowTop: 0,
      page: { width: 100, height: 150, top: 0, right: 0, bottom: 0, left: 0 },
      gap: 10,
      pages: 2,
    }
    expect(bookCaretFromPoint(editable, root, { x: 150, y: 50 }, pages)).toEqual({
      node: text,
      offset: 9,
    })
    expect(hit).toHaveBeenCalledTimes(2)
  } finally {
    document.caretPositionFromPoint = original
  }
})
