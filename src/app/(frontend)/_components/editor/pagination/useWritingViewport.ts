'use client'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import type { LexicalEditor } from 'lexical'
import { useEffect } from 'react'

const CARET_CLEARANCE = 16
const COMPACT_VIEWPORT_HEIGHT = 400

function syncViewportAppearance(
  screen: HTMLElement | null | undefined,
  viewport?: VisualViewport | null,
) {
  const height = viewport?.height ?? window.innerHeight
  screen?.toggleAttribute('data-compact-writing', height < COMPACT_VIEWPORT_HEIGHT)
  screen?.style.setProperty('--visible-viewport-height', `${height}px`)
  screen?.style.setProperty('--visible-viewport-offset-top', `${viewport?.offsetTop ?? 0}px`)
}

function focusedCaretRect(editor: LexicalEditor) {
  if (editor.isComposing() || window.matchMedia('print').matches) return
  const root = editor.getRootElement()
  if (!root || document.activeElement !== root) return
  const selection = window.getSelection()
  if (!selection?.isCollapsed || !selection.focusNode || !selection.rangeCount) return
  if (!root.contains(selection.focusNode)) return
  const caret = selection.getRangeAt(0).getClientRects()[0]
  return caret?.height ? caret : undefined
}

function scrollCaretIntoView(caret: DOMRect, viewport?: VisualViewport | null) {
  const header = document.querySelector('[data-editor-header]')?.getBoundingClientRect().bottom ?? 0
  const top = Math.max(viewport?.offsetTop ?? 0, header) + CARET_CLEARANCE
  const viewportBottom = (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight)
  const navigationTop = document
    .querySelector('[data-mobile-document-navigator]')
    ?.getBoundingClientRect().top
  const bottom = Math.min(viewportBottom, navigationTop ?? viewportBottom) - CARET_CLEARANCE
  if (bottom <= top) return
  if (caret.bottom > bottom) window.scrollBy(0, caret.bottom - bottom)
  else if (caret.top < top) window.scrollBy(0, caret.top - top)
}

// Native scrolling remains in charge unless the keyboard or sticky header obscures the caret.
export function useWritingViewport(enabled: boolean) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    if (!enabled) return
    const viewport = window.visualViewport
    const screen = editor.getRootElement()?.closest<HTMLElement>('[data-editor-screen]')
    let frame = 0
    let pointerDown = false
    const reveal = () => {
      frame = 0
      syncViewportAppearance(screen, viewport)
      if (pointerDown) return
      const caret = focusedCaretRect(editor)
      if (caret) scrollCaretIntoView(caret, viewport)
    }
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(reveal)
    }
    const startPointer = () => {
      pointerDown = true
    }
    const endPointer = () => {
      pointerDown = false
    }
    const unregister = editor.registerUpdateListener(schedule)
    schedule()
    viewport?.addEventListener('resize', schedule)
    viewport?.addEventListener('scroll', schedule)
    document.addEventListener('selectionchange', schedule)
    window.addEventListener('pointerdown', startPointer)
    window.addEventListener('pointerup', endPointer)
    window.addEventListener('pointercancel', endPointer)
    return () => {
      cancelAnimationFrame(frame)
      screen?.style.removeProperty('--visible-viewport-height')
      screen?.style.removeProperty('--visible-viewport-offset-top')
      screen?.removeAttribute('data-compact-writing')
      unregister()
      viewport?.removeEventListener('resize', schedule)
      viewport?.removeEventListener('scroll', schedule)
      document.removeEventListener('selectionchange', schedule)
      window.removeEventListener('pointerdown', startPointer)
      window.removeEventListener('pointerup', endPointer)
      window.removeEventListener('pointercancel', endPointer)
    }
  }, [editor, enabled])
}
