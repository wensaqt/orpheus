import type { ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { EditorViewProvider, useEditorView } from '@front/compositions/[id]/_components/editorView'
import { setPreferenceCookie } from '@front/_lib/preferences'

vi.mock('@front/_lib/preferences', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@front/_lib/preferences')>()),
  setPreferenceCookie: vi.fn(),
}))

function renderView(bookViewAvailable: boolean) {
  return renderHook(useEditorView, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <EditorViewProvider
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
