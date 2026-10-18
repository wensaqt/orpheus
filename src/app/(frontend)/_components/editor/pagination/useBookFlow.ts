'use client'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  KEY_DOWN_COMMAND,
} from 'lexical'
import { type MouseEvent, type RefObject, useEffect, useEffectEvent, useRef, useState } from 'react'

import { clamp } from '@/lib/numbers'
import { isMainButton } from '@front/_components/ui/pointer'
import { PAGE_BREAK_ATTRIBUTE } from '../constants'
import {
  $selectTextBefore,
  bookCaretFromPoint,
  bookCaretTarget,
  caretFromPoint,
} from './caretPlacement'
import { BookMirror } from './bookMirror'
import type { PageGeometry } from './types'

const DRAG_SCROLL_EDGE = 48
const DRAG_SCROLL_STEP = 24
const CARET_EDGE_TOLERANCE = 1

function editorHeaderBottom(): number {
  return document.querySelector('[data-editor-header]')?.getBoundingClientRect().bottom ?? 0
}

function scrollDuringDrag(y: number, header: number): boolean {
  const top = header + DRAG_SCROLL_EDGE
  const bottom = window.innerHeight - DRAG_SCROLL_EDGE
  const direction = y < top ? -1 : y > bottom ? 1 : 0
  const before = window.scrollY
  if (direction) window.scrollBy(0, direction * DRAG_SCROLL_STEP)
  return window.scrollY !== before
}

// Resolve a point in a displayed copy back to the same node in the single editor.
function originalNode(node: Node, copy: Node, original: Node): Node | null {
  const path: number[] = []
  while (node !== copy) {
    const parent = node.parentNode
    if (!parent) return null
    path.unshift(Array.prototype.indexOf.call(parent.childNodes, node))
    node = parent
  }
  let result: Node | undefined = original
  for (const index of path) result = result?.childNodes[index]
  return result ?? null
}

/*
 * CSS columns keep one native editable flow. Stack clipped views of that flow vertically,
 * placing the real editor in the spread being edited. Only nearby spreads get DOM copies;
 * copies are excluded from accessibility and never become independent editors.
 */
export function useBookFlow(
  root: RefObject<HTMLDivElement | null>,
  page: PageGeometry,
  measureGap: () => number,
  pages: number,
  enabled: boolean,
) {
  const [editor] = useLexicalComposerContext()
  const stack = useRef<HTMLDivElement>(null)
  const viewport = useRef<HTMLDivElement>(null)
  const activeRef = useRef(0)
  const dragAnchor = useRef<{ node: Node; offset: number } | null>(null)
  const dragPoint = useRef<{ x: number; y: number } | null>(null)
  const dragFrame = useRef(0)
  const repaintSelection = useRef<(() => void) | null>(null)
  const [active, setActive] = useState(0)
  const lastSpread = Math.ceil(pages / 2) - 1

  useEffect(() => {
    if (enabled) return
    dragAnchor.current = null
    dragPoint.current = null
    viewport.current?.style.removeProperty('--row')
    if (viewport.current) viewport.current.scrollLeft = 0
  }, [enabled])

  const showSpread = (index: number) => {
    const element = viewport.current
    if (!element) return
    const next = clamp(index, 0, lastSpread)
    activeRef.current = next
    element.style.setProperty('--row', String(next))
    element.scrollLeft = next * 2 * (page.width + measureGap())
    setActive(next)
  }
  const updateSpread = useEffectEvent(showSpread)

  const hitAt = (x: number, y: number) => {
    const target = document.elementFromPoint(x, y)
    const text = editor.getRootElement()
    if (!target || !text || !stack.current?.contains(target)) return null
    const spread = target.closest<HTMLElement>('[data-book-spread]')
    const copy = spread?.querySelector<HTMLElement>('[data-book-copy-editor]')
    if (spread && !copy) return null
    const displayedText = copy ?? text
    const track = copy ? spread?.firstElementChild : root.current
    if (!(track instanceof HTMLElement)) return null
    const caret = bookCaretFromPoint(
      displayedText,
      track,
      { x, y },
      { page, gap: measureGap(), pages, flowTop: 0 },
    )
    if (!caret) return null
    // WebKit can place a point in the whitespace after a line one character
    // before its end. A drag past the last glyph should include that glyph.
    if (caret.node.nodeType === Node.TEXT_NODE) {
      const range = document.createRange()
      range.selectNodeContents(caret.node)
      const rects = range.getClientRects()
      const last = rects[rects.length - 1]
      if (
        last &&
        x > last.right + CARET_EDGE_TOLERANCE &&
        y >= last.top - CARET_EDGE_TOLERANCE &&
        y <= last.bottom + CARET_EDGE_TOLERANCE
      ) {
        caret.offset = caret.node.textContent?.length ?? caret.offset
      }
    }
    const node = copy ? originalNode(caret.node, copy, text) : caret.node
    if (!node || !text.contains(node)) return null
    return {
      node,
      offset: caret.offset,
      spread: spread ? Number(spread.dataset.bookSpread) : activeRef.current,
    }
  }

  const extendToPointer = useEffectEvent(() => {
    const anchor = dragAnchor.current
    const point = dragPoint.current
    const container = stack.current
    if (!anchor || !point || !container) return
    const header = editorHeaderBottom()
    const box = container.getBoundingClientRect()
    // The scroll activation band is not a text boundary: keep hit testing under the pointer.
    const hit = hitAt(
      clamp(point.x, box.left + 1, box.right - 1),
      clamp(point.y, header + 1, window.innerHeight - 1),
    )
    if (hit) {
      if (activeRef.current !== hit.spread) updateSpread(hit.spread)
      const selection = window.getSelection()
      if (selection?.focusNode !== hit.node || selection.focusOffset !== hit.offset) {
        selection?.setBaseAndExtent(anchor.node, anchor.offset, hit.node, hit.offset)
      }
      repaintSelection.current?.()
    }
  })

  const dragStep = useEffectEvent(() => {
    const point = dragPoint.current
    if (!dragAnchor.current || !point) return false
    const scrolled = scrollDuringDrag(point.y, editorHeaderBottom())
    extendToPointer()
    return scrolled
  })

  const revealCaret = useEffectEvent(() => {
    // A drag owns scrolling; revealing its focus at every selectionchange fights edge scrolling.
    if (dragAnchor.current) return
    const track = root.current
    const text = editor.getRootElement()
    const selection = window.getSelection()
    if (!track || !text || !selection?.focusNode || !text.contains(selection.focusNode)) return
    const range = document.createRange()
    range.setStart(selection.focusNode, selection.focusOffset)
    range.collapse(true)
    const rect = range.getClientRects()[0]
    if (!rect) return
    const box = track.getBoundingClientRect()
    const scale = box.width / parseFloat(getComputedStyle(track).width)
    const column = Math.floor(
      ((rect.left - box.left) / scale - page.left + 1) / (page.width + measureGap()),
    )
    updateSpread(Math.floor(column / 2))
    const caret = range.getClientRects()[0]
    if (!caret) return
    const header = editorHeaderBottom()
    if (caret.bottom > window.innerHeight) window.scrollBy(0, caret.bottom - window.innerHeight)
    else if (caret.top < header) window.scrollBy(0, caret.top - header)
  })

  useEffect(() => {
    if (!enabled) return
    const track = root.current
    const container = stack.current
    const text = editor.getRootElement()
    if (!track || !container || !text) return
    const visible = new Set<HTMLElement>()
    const mirrors = new Map<HTMLElement, BookMirror>()
    const highlight = new Highlight()
    let mirrorFrame = 0
    let caretFrame = 0
    const paintSelection = () => {
      highlight.clear()
      const selection = window.getSelection()
      if (selection?.rangeCount && !selection.isCollapsed) {
        const selected = selection.getRangeAt(0)
        if (text.contains(selected.startContainer) && text.contains(selected.endContainer)) {
          // WebKit can defer native selection painting until mouseup for a scripted drag.
          highlight.add(selected.cloneRange())
          for (const spread of visible) {
            const copy = spread.querySelector('[data-book-copy-editor]')
            if (!copy) continue
            const start = originalNode(selected.startContainer, text, copy)
            const end = originalNode(selected.endContainer, text, copy)
            if (!start || !end) continue
            const range = document.createRange()
            range.setStart(start, selected.startOffset)
            range.setEnd(end, selected.endOffset)
            highlight.add(range)
          }
        }
      }
      CSS.highlights.set('orpheus-book-selection', highlight)
    }
    repaintSelection.current = paintSelection
    const refresh = () => {
      if (window.matchMedia('print').matches) return
      updateSpread(activeRef.current)
      for (const spread of visible) {
        const index = Number(spread.dataset.bookSpread)
        if (index === activeRef.current) {
          spread.replaceChildren()
          mirrors.delete(spread)
          continue
        }
        if (mirrors.has(spread)) continue
        const mirror = new BookMirror(track)
        mirrors.set(spread, mirror)
        spread.replaceChildren(mirror.element)
      }
      paintSelection()
    }
    const scheduleMirrors = () => {
      cancelAnimationFrame(mirrorFrame)
      mirrorFrame = requestAnimationFrame(refresh)
    }
    const scheduleCaret = () => {
      cancelAnimationFrame(caretFrame)
      caretFrame = requestAnimationFrame(() => {
        revealCaret()
        paintSelection()
      })
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const spread = entry.target as HTMLElement
          if (entry.isIntersecting) visible.add(spread)
          else {
            visible.delete(spread)
            mirrors.delete(spread)
            spread.replaceChildren()
          }
        }
        scheduleMirrors()
      },
      { rootMargin: '100% 0px' },
    )
    for (const spread of container.querySelectorAll('[data-book-spread]')) observer.observe(spread)
    const mutations = new MutationObserver((records) => {
      for (const mirror of mirrors.values()) mirror.apply(records)
      paintSelection()
    })
    mutations.observe(track, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
    })
    const unregister = editor.registerUpdateListener(({ dirtyElements, dirtyLeaves }) => {
      if (dirtyElements.size || dirtyLeaves.size) scheduleCaret()
    })
    // Firefox's native document-edge shortcuts stop at an editable column's visible
    // edge. Resolve these through Lexical so they reach the actual document edges.
    const unregisterEdges = editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event) => {
        const end =
          (event.metaKey && event.key === 'ArrowDown') || (event.ctrlKey && event.key === 'End')
        const start =
          (event.metaKey && event.key === 'ArrowUp') || (event.ctrlKey && event.key === 'Home')
        if ((!start && !end) || event.altKey) return false
        const selection = $getSelection()
        if (!$isRangeSelection(selection)) return false
        const anchor = event.shiftKey ? { ...selection.anchor } : null
        event.preventDefault()
        const next = end ? $getRoot().selectEnd() : $getRoot().selectStart()
        if (anchor) next.anchor.set(anchor.key, anchor.offset, anchor.type)
        return true
      },
      COMMAND_PRIORITY_HIGH,
    )
    document.addEventListener('selectionchange', scheduleCaret)
    const continueDrag = () => {
      dragFrame.current = 0
      if (dragStep()) dragFrame.current = requestAnimationFrame(continueDrag)
    }
    const extendSelection = (event: globalThis.MouseEvent) => {
      if (!dragAnchor.current) return
      if (event.buttons !== 1) {
        stopDragging()
        return
      }
      event.preventDefault()
      dragPoint.current = { x: event.clientX, y: event.clientY }
      // Coalesce pointer events: edge-scroll speed must not depend on the mouse event rate.
      if (!dragFrame.current) dragFrame.current = requestAnimationFrame(continueDrag)
    }
    const stopDragging = () => {
      // Mouseup can precede the next animation frame; commit its pending endpoint first.
      extendToPointer()
      dragAnchor.current = null
      dragPoint.current = null
      cancelAnimationFrame(dragFrame.current)
      dragFrame.current = 0
      paintSelection()
    }
    window.addEventListener('mousemove', extendSelection)
    window.addEventListener('mouseup', stopDragging)
    window.addEventListener('blur', stopDragging)
    window.addEventListener('resize', scheduleMirrors)
    const media = window.matchMedia('print')
    const restore = () => {
      if (!media.matches) {
        updateSpread(activeRef.current)
        scheduleMirrors()
      }
    }
    media.addEventListener('change', restore)
    updateSpread(activeRef.current)
    scheduleMirrors()
    scheduleCaret()
    if (dragAnchor.current && dragPoint.current)
      dragFrame.current = requestAnimationFrame(continueDrag)
    return () => {
      cancelAnimationFrame(dragFrame.current)
      dragFrame.current = 0
      cancelAnimationFrame(mirrorFrame)
      cancelAnimationFrame(caretFrame)
      observer.disconnect()
      mutations.disconnect()
      CSS.highlights.delete('orpheus-book-selection')
      repaintSelection.current = null
      unregister()
      unregisterEdges()
      document.removeEventListener('selectionchange', scheduleCaret)
      window.removeEventListener('mousemove', extendSelection)
      window.removeEventListener('mouseup', stopDragging)
      window.removeEventListener('blur', stopDragging)
      window.removeEventListener('resize', scheduleMirrors)
      media.removeEventListener('change', restore)
    }
  }, [editor, enabled, pages, active, page.width, page.height, measureGap, root])

  const handleCopyMouseDown = (event: MouseEvent<HTMLElement>, index: number) => {
    if (event.defaultPrevented || !isMainButton(event)) return
    const text = editor.getRootElement()
    const copy = event.currentTarget.querySelector<HTMLElement>('[data-book-copy-editor]')
    const track = event.currentTarget.firstElementChild
    if (!text || !copy || !(track instanceof HTMLElement)) return
    event.preventDefault()
    const target = event.target
    const pageBreak = target instanceof Element ? target.closest(`[${PAGE_BREAK_ATTRIBUTE}]`) : null
    if (pageBreak) {
      const original = originalNode(pageBreak, copy, text)
      showSpread(index)
      text.focus({ preventScroll: true })
      if (original instanceof Element) editor.update(() => $selectTextBefore(original))
      return
    }
    const click = { x: event.clientX, y: event.clientY }
    const point = copy.contains(target as Node)
      ? click
      : bookCaretTarget(copy, track, click, { page, gap: measureGap(), pages, flowTop: 0 })
    if (!point) return
    const caret = caretFromPoint(point)
    if (!caret) return
    const original = originalNode(caret.node, copy, text)
    if (!original) return
    showSpread(index)
    text.focus({ preventScroll: true })
    window.getSelection()?.collapse(original, caret.offset)
  }

  const startSelection = (event: MouseEvent<HTMLElement>) => {
    dragAnchor.current = null
    dragPoint.current = null
    if (!enabled || !isMainButton(event) || event.detail !== 1) return
    if (event.target instanceof Element && event.target.closest(`[${PAGE_BREAK_ATTRIBUTE}]`)) return
    const hit = hitAt(event.clientX, event.clientY)
    const text = editor.getRootElement()
    if (!hit || !text) return
    event.preventDefault()
    const selection = window.getSelection()
    const anchor =
      event.shiftKey && selection?.anchorNode && text.contains(selection.anchorNode)
        ? { node: selection.anchorNode, offset: selection.anchorOffset }
        : { node: hit.node, offset: hit.offset }
    dragAnchor.current = anchor
    showSpread(hit.spread)
    text.focus({ preventScroll: true })
    selection?.setBaseAndExtent(anchor.node, anchor.offset, hit.node, hit.offset)
  }

  return { stack, viewport, active, startSelection, handleCopyMouseDown }
}
