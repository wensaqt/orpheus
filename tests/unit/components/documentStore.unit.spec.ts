import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clearDocuments,
  forgetDocuments,
  loadDocument,
  rememberDocument,
  seedDocument,
  useDocumentSlot,
} from '@front/_features/binder/documentStore'

import { uuid } from '../../helpers/ids'

const composition = uuid(10)
const id = uuid(1)
const serverDocument = (updatedAt: string) => ({ id, title: 'Chant', content: null, updatedAt })

const respond = (status: number, body: unknown = null) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }))

describe('documentStore', () => {
  const fetchMock = vi.fn<typeof fetch>()
  beforeEach(() => {
    clearDocuments()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    // Without Vitest globals, Testing Library does not unmount between tests on its own
    cleanup()
    vi.unstubAllGlobals()
  })

  it('loads a document once, however many ask for it meanwhile', async () => {
    fetchMock.mockReturnValue(respond(200, serverDocument('2026-10-02T10:00:00.000Z')))
    const { result } = renderHook(() => useDocumentSlot(id))
    await act(() => Promise.all([loadDocument(composition, id), loadDocument(composition, id)]))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.current).toMatchObject({
      status: 'ready',
      document: { updatedAt: '2026-10-02T10:00:00.000Z' },
    })
  })

  it('asks nothing for a document just loaded or saved', async () => {
    rememberDocument(id, { content: null, updatedAt: '2026-10-02T10:00:00.000Z' })
    await loadDocument(composition, id)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('checks a version older than the freshness window again', async () => {
    vi.useFakeTimers({ now: 0, toFake: ['Date'] })
    rememberDocument(id, { content: null, updatedAt: '2026-10-02T10:00:00.000Z' })
    vi.setSystemTime(61_000)
    fetchMock.mockReturnValue(respond(200, serverDocument('2026-10-02T10:00:00.000Z')))
    await loadDocument(composition, id)
    vi.useRealTimers()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('keeps the newer version when an older one arrives late', async () => {
    let answer!: (response: Response) => void
    fetchMock.mockReturnValue(new Promise((resolve) => (answer = resolve)))
    const { result } = renderHook(() => useDocumentSlot(id))
    const load = loadDocument(composition, id)
    // Saved here while the load was on its way
    act(() => rememberDocument(id, { content: null, updatedAt: '2026-10-02T10:00:05.000Z' }))
    answer(new Response(JSON.stringify(serverDocument('2026-10-02T10:00:00.000Z'))))
    await act(() => load)
    expect(result.current).toMatchObject({ document: { updatedAt: '2026-10-02T10:00:05.000Z' } })
  })

  it('tells a missing document from a failed load, and keeps a cached one on failure', async () => {
    const { result } = renderHook(() => useDocumentSlot(id))
    fetchMock.mockReturnValueOnce(respond(404))
    await act(() => loadDocument(composition, id))
    expect(result.current).toEqual({ status: 'missing' })

    clearDocuments()
    fetchMock.mockRejectedValueOnce(new TypeError('offline'))
    await act(() => loadDocument(composition, id))
    expect(result.current).toEqual({ status: 'error' })

    vi.useFakeTimers({ now: 0, toFake: ['Date'] })
    act(() => rememberDocument(id, { content: null, updatedAt: '2026-10-02T10:00:00.000Z' }))
    vi.setSystemTime(61_000)
    fetchMock.mockReturnValueOnce(respond(500))
    await act(() => loadDocument(composition, id))
    vi.useRealTimers()
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(result.current?.status).toBe('ready')
  })

  it('forgets documents, one by one or all at once', () => {
    rememberDocument(id, { content: null, updatedAt: '2026-10-02T10:00:00.000Z' })
    rememberDocument(uuid(2), { content: null, updatedAt: '2026-10-02T10:00:00.000Z' })
    const { result: first } = renderHook(() => useDocumentSlot(id))
    const { result: second } = renderHook(() => useDocumentSlot(uuid(2)))
    act(() => forgetDocuments([id]))
    expect(first.current).toBeUndefined()
    expect(second.current?.status).toBe('ready')
    act(() => clearDocuments())
    expect(second.current).toBeUndefined()
  })

  it('fills an empty slot from the page, but still checks that copy with the server', async () => {
    fetchMock.mockReturnValue(respond(200, serverDocument('2026-10-02T10:00:09.000Z')))
    const { result } = renderHook(() => useDocumentSlot(id))
    act(() => seedDocument(id, { content: null, updatedAt: '2026-10-02T10:00:00.000Z' }))
    expect(result.current?.status).toBe('ready')
    await act(() => loadDocument(composition, id))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.current).toMatchObject({ document: { updatedAt: '2026-10-02T10:00:09.000Z' } })
  })

  it('never lets an old page copy replace what is cached, nor refresh its check', async () => {
    rememberDocument(id, { content: null, updatedAt: '2026-10-02T10:00:05.000Z' })
    seedDocument(id, { content: null, updatedAt: '2026-10-02T10:00:00.000Z' })
    const { result } = renderHook(() => useDocumentSlot(id))
    expect(result.current).toMatchObject({ document: { updatedAt: '2026-10-02T10:00:05.000Z' } })
  })

  it('keeps only the text and its version, not the rest of the server document', async () => {
    fetchMock.mockReturnValue(respond(200, serverDocument('2026-10-02T10:00:00.000Z')))
    const { result } = renderHook(() => useDocumentSlot(id))
    await act(() => loadDocument(composition, id))
    expect(
      result.current?.status === 'ready' && Object.keys(result.current.document).sort(),
    ).toEqual(['checkedAt', 'content', 'updatedAt'])
  })

  it('drops the answer of a load that was on its way when the store was cleared', async () => {
    let answer!: (response: Response) => void
    fetchMock.mockReturnValue(new Promise((resolve) => (answer = resolve)))
    const { result } = renderHook(() => useDocumentSlot(id))
    const load = loadDocument(composition, id)
    act(() => clearDocuments())
    answer(new Response(JSON.stringify(serverDocument('2026-10-02T10:00:00.000Z'))))
    await act(() => load)
    expect(result.current).toBeUndefined()
  })

  it('sends the writer to the login page when the session is gone', async () => {
    const assign = vi.fn()
    vi.stubGlobal('location', { ...window.location, assign, pathname: '/compositions/x/y' })
    fetchMock.mockReturnValue(respond(401))
    void loadDocument(composition, id)
    await vi.waitFor(() =>
      expect(assign).toHaveBeenCalledWith('/login?redirect=%2Fcompositions%2Fx%2Fy'),
    )
  })
})
