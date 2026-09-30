import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { SynonymResult } from '@front/_features/lexicon/types'

const findSynonyms = vi.fn()
vi.mock('@front/_features/lexicon/actions', () => ({ findSynonyms }))

const { useSynonyms } = await import('@front/_features/lexicon/useSynonyms')

const resultFor = (query: string, words = [`syn-${query}`]): SynonymResult => ({
  query,
  word: query,
  groups: [{ partOfSpeech: 'adjective', sense: null, words, reliable: true }],
  more: [],
  sourceUrl: `https://fr.wiktionary.org/wiki/${query}`,
})

describe('useSynonyms', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    findSynonyms.mockReset().mockImplementation(async (query: string) => resultFor(query))
  })
  afterEach(() => vi.useRealTimers())

  const typeAndWait = async (result: { current: ReturnType<typeof useSynonyms> }, word: string) => {
    act(() => result.current.setQuery(word))
    await act(async () => vi.advanceTimersByTimeAsync(250))
  }

  it('searches after a typing pause, without showing "loading" during the pause', async () => {
    const { result } = renderHook(() => useSynonyms())
    act(() => result.current.setQuery('vif'))
    expect(result.current.status).toBe('idle')
    expect(findSynonyms).not.toHaveBeenCalled()

    await act(async () => vi.advanceTimersByTimeAsync(250))
    expect(findSynonyms).toHaveBeenCalledWith('vif')
    expect(result.current).toMatchObject({ status: 'done', result: { query: 'vif' } })
  })

  it('keeps the previous result while the next search is pending', async () => {
    const { result } = renderHook(() => useSynonyms())
    await typeAndWait(result, 'vif')
    act(() => result.current.setQuery('vite'))
    expect(result.current.result?.query).toBe('vif')
  })

  it('keeps only the answer to the latest request', async () => {
    let resolveSlow!: (value: SynonymResult) => void
    findSynonyms.mockImplementationOnce(() => new Promise((resolve) => (resolveSlow = resolve)))
    const { result } = renderHook(() => useSynonyms())

    await typeAndWait(result, 'lent') // slow request in flight
    await typeAndWait(result, 'vif')
    await act(async () => resolveSlow(resultFor('lent', ['stale'])))
    expect(result.current.result?.query).toBe('vif')
  })

  it('searches immediately on Enter', async () => {
    const { result } = renderHook(() => useSynonyms())
    act(() => result.current.setQuery('vif'))
    await act(async () => {
      result.current.searchNow()
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(findSynonyms).toHaveBeenCalledTimes(1)
  })

  it('clears the result on error, then recovers on the next search', async () => {
    const { result } = renderHook(() => useSynonyms())
    await typeAndWait(result, 'vif')

    findSynonyms.mockRejectedValueOnce(new Error('Wiktionary responded 503'))
    await typeAndWait(result, 'lent')
    expect(result.current).toMatchObject({ status: 'error', result: null })

    await typeAndWait(result, 'prompt')
    expect(result.current).toMatchObject({ status: 'done', result: { query: 'prompt' } })
  })

  it('an empty field clears the result', async () => {
    const { result } = renderHook(() => useSynonyms())
    await typeAndWait(result, 'vif')
    act(() => result.current.setQuery('   '))
    expect(result.current).toMatchObject({ status: 'idle', result: null })
  })

  it('ignores an answer that arrives after unmount', async () => {
    let resolveLate!: (value: SynonymResult) => void
    findSynonyms.mockImplementationOnce(() => new Promise((resolve) => (resolveLate = resolve)))
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { result, unmount } = renderHook(() => useSynonyms())

    await typeAndWait(result, 'vif')
    unmount()
    await act(async () => resolveLate(resultFor('vif')))
    expect(errors).not.toHaveBeenCalled()
    errors.mockRestore()
  })
})
