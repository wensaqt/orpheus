'use client'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useEffect } from 'react'

const CARET_CLEARANCE = 16

// Native scrolling remains in charge unless the keyboard or sticky header obscures the caret.
export function useWritingViewport(enabled: boolean) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    if (!enabled) return
    const viewport = window.visualViewport
    let frame = 0
    let pointerDown = false
    const screen = editor.getRootElement()?.closest<HTMLElement>('[data-editor-screen]')
    const reveal = () => {
      frame = 0
      screen?.toggleAttribute(
        'data-compact-writing',
        (viewport?.height ?? window.innerHeight) < 400,
      )
      screen?.style.setProperty(
        '--visible-viewport-height',
        `${viewport?.height ?? window.innerHeight}px`,
      )
      const root = editor.getRootElement()
      const selection = window.getSelection()
      if (
        pointerDown ||
        editor.isComposing() ||
        !root ||
        document.activeElement !== root ||
        !selection?.isCollapsed ||
        !selection.focusNode ||
        !root.contains(selection.focusNode) ||
        !selection.rangeCount ||
        window.matchMedia('print').matches
      )
        return
      const caret = selection.getRangeAt(0).getClientRects()[0]
      if (!caret?.height) return
      const header =
        document.querySelector('[data-editor-header]')?.getBoundingClientRect().bottom ?? 0
      const top = Math.max(viewport?.offsetTop ?? 0, header) + CARET_CLEARANCE
      const bottom =
        (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight) - CARET_CLEARANCE
      if (bottom <= top) return
      if (caret.bottom > bottom) window.scrollBy(0, caret.bottom - bottom)
      else if (caret.top < top) window.scrollBy(0, caret.top - top)
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
