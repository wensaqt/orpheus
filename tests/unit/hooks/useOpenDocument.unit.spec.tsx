import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useOpenDocument } from '@front/compositions/[id]/_components/binder/state/useOpenDocument'
import { ROUTES } from '@front/_lib/routes'
import { uuid } from '../../helpers/ids'

const mocks = vi.hoisted(() => ({
  pathname: '',
  toast: { error: vi.fn() },
  t: (key: string) => key,
}))
vi.mock('next/navigation', () => ({ usePathname: () => mocks.pathname }))
vi.mock('@front/_components/i18n/I18nProvider', () => ({ useT: () => mocks.t }))
vi.mock('@front/_components/ui/Feedback/ToastProvider', () => ({ useToast: () => mocks.toast }))

describe('useOpenDocument', () => {
  const composition = uuid(1)
  const first = uuid(2)
  const second = uuid(3)

  beforeEach(() => {
    mocks.pathname = ROUTES.document(composition, first)
    window.history.replaceState(null, '', mocks.pathname)
    mocks.toast.error.mockClear()
  })
  afterEach(cleanup)

  it('saves once before committing a programmatic document switch', async () => {
    const flush = vi.fn(async () => true)
    const { result, rerender } = renderHook(() => useOpenDocument(composition, flush))
    await act(async () => {
      expect(await result.current.navigate(second)).toBe(true)
      // Next's history integration updates usePathname alongside pushState.
      mocks.pathname = window.location.pathname
    })
    expect(result.current.activeDocumentId).toBe(second)
    expect(window.location.pathname).toBe(ROUTES.document(composition, second))
    mocks.pathname = window.location.pathname
    rerender()
    expect(flush).toHaveBeenCalledTimes(1)
  })

  it('keeps the URL and document when a programmatic switch cannot save', async () => {
    const { result } = renderHook(() => useOpenDocument(composition, async () => false))
    await act(async () => {
      expect(await result.current.navigate(second)).toBe(false)
    })
    expect(result.current.activeDocumentId).toBe(first)
    expect(window.location.pathname).toBe(ROUTES.document(composition, first))
    expect(mocks.toast.error).toHaveBeenCalledWith('binder.saveFirst')
  })

  it('restores the shown document URL when browser navigation cannot save', async () => {
    const flush = vi.fn(async () => false)
    const { result, rerender } = renderHook(() => useOpenDocument(composition, flush))
    mocks.pathname = ROUTES.document(composition, second)
    window.history.pushState(null, '', mocks.pathname)
    rerender()
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledTimes(1))
    expect(result.current.activeDocumentId).toBe(first)
    expect(window.location.pathname).toBe(ROUTES.document(composition, first))
  })
})
