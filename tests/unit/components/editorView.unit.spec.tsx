import type { ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { EditorViewProvider, useEditorView } from '@front/compositions/[id]/_components/editorView'
import { setPreferenceCookie } from '@front/_lib/preferences'

vi.mock('@front/_lib/preferences', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@front/_lib/preferences')>()),
  setPreferenceCookie: vi.fn(),
}))

function renderView(bookViewAvailable: boolean, continuous = () => false) {
  return renderHook(useEditorView, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <EditorViewProvider
        continuous={continuous()}
        bookView
        bookViewAvailable={bookViewAvailable}
        rulerHidden={false}
        synonymsHidden={false}
      >
        {children}
      </EditorViewProvider>
    ),
  })
}

describe('book view availability', () => {
  it('ignores a saved book preference and prevents activation when unavailable', () => {
    vi.mocked(setPreferenceCookie).mockClear()
    const { result } = renderView(false)
    expect(result.current.bookView).toBe(false)
    act(() => result.current.toggleBookView())
    expect(result.current.bookView).toBe(false)
    expect(setPreferenceCookie).not.toHaveBeenCalled()
  })

  it('preserves the saved preference and allows toggling in supported browsers', () => {
    const { result } = renderView(true)
    expect(result.current.bookView).toBe(true)
    act(() => result.current.toggleBookView())
    expect(result.current.bookView).toBe(false)
  })
})

describe('continuous writing', () => {
  it('temporarily disables paper controls without replacing the saved preferences', () => {
    vi.mocked(setPreferenceCookie).mockClear()
    let continuous = false
    const { result, rerender } = renderView(true, () => continuous)
    expect(result.current.bookView).toBe(true)
    expect(result.current.rulerVisible).toBe(true)
    continuous = true
    rerender()
    expect(result.current.bookView).toBe(false)
    expect(result.current.bookViewAvailable).toBe(false)
    expect(result.current.rulerVisible).toBe(false)
    act(() => {
      result.current.toggleBookView()
      result.current.toggleRuler()
    })
    expect(setPreferenceCookie).not.toHaveBeenCalled()
    continuous = false
    rerender()
    expect(result.current.bookView).toBe(true)
    expect(result.current.rulerVisible).toBe(true)
  })

  it('uses a temporary synonyms panel without changing its desktop preference', () => {
    vi.mocked(setPreferenceCookie).mockClear()
    let continuous = true
    const { result, rerender } = renderView(true, () => continuous)
    expect(result.current.synonymsVisible).toBe(false)
    act(() => result.current.showSynonyms())
    expect(result.current.synonymsOver).toBe(true)
    act(() => result.current.hideSynonyms())
    expect(setPreferenceCookie).not.toHaveBeenCalled()
    continuous = false
    rerender()
    expect(result.current.synonymsVisible).toBe(true)
  })
})
