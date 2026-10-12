import { afterEach, expect, it, vi } from 'vitest'
import { bookCaretTarget } from '@front/_components/editor/pagination/caretPlacement'
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
  expect(bookCaretTarget(editable, root, { x: 380, y: 85 }, pages)).toEqual({ x: 380, y: 40 })
  rectangles.pop()
  expect(bookCaretTarget(editable, root, { x: 380, y: 85 }, pages)).toBeNull()
})
