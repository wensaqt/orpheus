import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { wiktionaryFixture } from '../../helpers/fixtures'

// MediaWiki API response for a fixture page, or "page not found"
function apiResponse(word: string) {
  try {
    return Response.json({ parse: { title: word, wikitext: wiktionaryFixture(word) } })
  } catch {
    return Response.json({ error: { code: 'missingtitle' } })
  }
}

const fetchMock = vi.fn((input: string | URL | Request, _init?: RequestInit) => {
  const page = new URL(String(input)).searchParams.get('page') ?? ''
  return Promise.resolve(apiResponse(page))
})

// The module cache is in memory: a fresh import per test so it starts empty
const loadLexicon = async () => {
  vi.resetModules()
  return import('@front/_features/lexicon/lexicon')
}

describe('lookupRelated', () => {
  beforeEach(() => {
    fetchMock.mockClear()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('queries Wiktionary with the normalised word and a User-Agent', async () => {
    const { lookupRelated } = await loadLexicon()
    const result = await lookupRelated('  Rapide ', 'antonyms')

    expect(result.word).toBe('rapide')
    expect(result.groups.flatMap((g) => g.words)).toEqual(['lent', 'long'])
    const [url, init] = fetchMock.mock.calls[0]
    expect(new URL(String(url)).searchParams.get('page')).toBe('rapide')
    expect(new Headers(init?.headers).get('User-Agent')).toMatch(/^Orpheus\//)
  })

  it('caches the page: switching relation makes no new request', async () => {
    const { lookupRelated } = await loadLexicon()
    await lookupRelated('rapide', 'synonyms')
    await lookupRelated('rapide', 'antonyms')
    await lookupRelated('rapide', 'synonyms')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('shares a single request between two concurrent lookups', async () => {
    const { lookupRelated } = await loadLexicon()
    await Promise.all([lookupRelated('rapide', 'synonyms'), lookupRelated('rapide', 'antonyms')])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('follows an inflected form to its base form', async () => {
    const { lookupRelated } = await loadLexicon()
    const result = await lookupRelated('rapides', 'antonyms')
    expect(result.word).toBe('rapide')
    expect(result.groups.flatMap((g) => g.words)).toContain('lent')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('returns null for a missing page', async () => {
    const { lookupRelated } = await loadLexicon()
    await expect(lookupRelated('xyzzyq', 'synonyms')).resolves.toEqual({ word: null, groups: [] })
  })

  it('propagates a Wiktionary HTTP error', async () => {
    fetchMock.mockImplementationOnce(() => Promise.resolve(new Response('', { status: 503 })))
    const { lookupRelated } = await loadLexicon()
    await expect(lookupRelated('rapide', 'synonyms')).rejects.toThrow('503')
  })
})
