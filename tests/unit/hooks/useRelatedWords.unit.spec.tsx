import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { LexiconResult, Relation } from '@front/_features/lexicon/types'

const findRelatedWords = vi.fn()
vi.mock('@front/_features/lexicon/actions', () => ({ findRelatedWords }))

const { useRelatedWords } = await import('@front/_features/lexicon/useRelatedWords')

const resultFor = (query: string, relation: Relation, words: string[]): LexiconResult => ({
  relation,
  query,
  word: query,
  groups: [{ partsOfSpeech: ['adjective'], sense: null, words }],
  sourceUrl: `https://fr.wiktionary.org/wiki/${query}`,
})

describe('useRelatedWords', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    findRelatedWords.mockReset()
    findRelatedWords.mockImplementation(async (query: string, relation: Relation) =>
      resultFor(query, relation, [`${relation}-de-${query}`]),
    )
  })
  afterEach(() => vi.useRealTimers())

  it('searches after a typing delay, without showing "loading" during that delay', async () => {
    const { result } = renderHook(() => useRelatedWords())
    act(() => result.current.setQuery('vif'))
    expect(result.current.status).toBe('idle')
    expect(findRelatedWords).not.toHaveBeenCalled()

    await act(async () => vi.advanceTimersByTimeAsync(250))
    expect(findRelatedWords).toHaveBeenCalledWith('vif', 'synonyms')
    expect(result.current.status).toBe('done')
    expect(result.current.result?.groups[0].words).toEqual(['synonyms-de-vif'])
  })

  it('keeps the previous result shown while typing the next query', async () => {
    const { result } = renderHook(() => useRelatedWords())
    act(() => result.current.setQuery('vif'))
    await act(async () => vi.advanceTimersByTimeAsync(250))

    act(() => result.current.setQuery('vite'))
    expect(result.current.result?.query).toBe('vif')
  })

  it('only keeps the response to the latest query', async () => {
    let resolveSlow!: (value: LexiconResult) => void
    findRelatedWords.mockImplementationOnce(
      () => new Promise<LexiconResult>((resolve) => (resolveSlow = resolve)),
    )
    const { result } = renderHook(() => useRelatedWords())

    act(() => result.current.setQuery('lent'))
    await act(async () => vi.advanceTimersByTimeAsync(250)) // slow request in flight
    act(() => result.current.setQuery('vif'))
    await act(async () => vi.advanceTimersByTimeAsync(250))
    await act(async () => resolveSlow(resultFor('lent', 'synonyms', ['stale'])))

    expect(result.current.result?.query).toBe('vif')
  })

  it('Enter triggers the search without waiting for the delay', async () => {
    const { result } = renderHook(() => useRelatedWords())
    act(() => result.current.setQuery('vif'))
    await act(async () => {
      result.current.searchNow()
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(findRelatedWords).toHaveBeenCalledTimes(1)
  })

  it('switching relation immediately re-runs the search for the current word', async () => {
    const { result } = renderHook(() => useRelatedWords())
    act(() => result.current.setQuery('vif'))
    await act(async () => vi.advanceTimersByTimeAsync(250))
    await act(async () => {
      result.current.setRelation('antonyms')
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(findRelatedWords).toHaveBeenLastCalledWith('vif', 'antonyms')
    expect(result.current.result?.relation).toBe('antonyms')
  })

  it('an empty field clears the result', async () => {
    const { result } = renderHook(() => useRelatedWords())
    act(() => result.current.setQuery('vif'))
    await act(async () => vi.advanceTimersByTimeAsync(250))
    act(() => result.current.setQuery('   '))
    expect(result.current).toMatchObject({ status: 'idle', result: null })
  })

  it('reports a server action error', async () => {
    findRelatedWords.mockRejectedValueOnce(new Error('Wiktionary responded 503'))
    const { result } = renderHook(() => useRelatedWords())
    act(() => result.current.setQuery('vif'))
    await act(async () => vi.advanceTimersByTimeAsync(250))
    expect(result.current.status).toBe('error')
  })
})
