import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { wiktionaryFixture } from '../../helpers/fixtures'

// Fake MediaWiki API: pages served from fixtures or from inline wikitext, others are missing
let inlinePages: Record<string, { title?: string; wikitext: string }> = {}

function apiResponse(page: string) {
  const inline = inlinePages[page]
  if (inline)
    return Response.json({ parse: { title: inline.title ?? page, wikitext: inline.wikitext } })
  try {
    return Response.json({ parse: { title: page, wikitext: wiktionaryFixture(page) } })
  } catch {
    return Response.json({ error: { code: 'missingtitle' } })
  }
}

const fetchMock = vi.fn((input: string | URL | Request, _init?: RequestInit) =>
  Promise.resolve(apiResponse(new URL(String(input)).searchParams.get('page') ?? '')),
)

// The module cache lives in memory: a fresh import per test so it starts empty
const loadLexicon = async () => {
  vi.resetModules()
  return import('@front/_features/lexicon/lexicon')
}

const inflectedPage = (lemma: string) =>
  [
    '== {{langue|fr}} ==',
    '=== {{S|adjectif|fr|flexion}} ===',
    `# ''Pluriel de'' [[${lemma}]].`,
  ].join('\n')

describe('lookupSynonyms', () => {
  beforeEach(() => {
    inlinePages = {}
    fetchMock.mockClear()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('queries Wiktionary with a User-Agent and credits the page', async () => {
    const { lookupSynonyms } = await loadLexicon()
    const result = await lookupSynonyms('rapide')

    expect(result.word).toBe('rapide')
    expect(result.groups[0].words).toContain('prompt')
    expect(result.sourceUrl).toBe('https://fr.wiktionary.org/wiki/rapide')
    const [, init] = fetchMock.mock.calls[0]
    expect(new Headers(init?.headers).get('User-Agent')).toMatch(/^Orpheus\//)
  })

  it('caches pages and shares a request between simultaneous searches', async () => {
    const { lookupSynonyms } = await loadLexicon()
    await Promise.all([lookupSynonyms('rapide'), lookupSynonyms('rapide')])
    await lookupSynonyms('rapide')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('follows an inflected form to its base form', async () => {
    const { lookupSynonyms } = await loadLexicon()
    const result = await lookupSynonyms('rapides')
    expect(result).toMatchObject({
      word: 'rapide',
      sourceUrl: 'https://fr.wiktionary.org/wiki/rapide',
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not follow the base form when the inflected page has its own synonyms', async () => {
    inlinePages.vives = {
      wikitext: `${inflectedPage('vif')}\n==== {{S|synonymes}} ====\n* [[alertes]]`,
    }
    const { lookupSynonyms } = await loadLexicon()
    expect(await lookupSynonyms('vives')).toMatchObject({
      word: 'vives',
      groups: [{ words: ['alertes'] }],
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('stops when the base form is the word itself or does not exist', async () => {
    inlinePages.boucle = { wikitext: inflectedPage('boucle') }
    inlinePages.orphelin = { wikitext: inflectedPage('introuvable') }
    const { lookupSynonyms } = await loadLexicon()

    expect(await lookupSynonyms('boucle')).toMatchObject({ word: 'boucle', groups: [] })
    expect(await lookupSynonyms('orphelin')).toMatchObject({ word: 'orphelin', groups: [] })
  })

  it('uses the redirect target as the entry and the source', async () => {
    inlinePages.oeuvre = {
      title: 'œuvre',
      wikitext: page('* [[ouvrage]]'),
    }
    const { lookupSynonyms } = await loadLexicon()
    expect(await lookupSynonyms('oeuvre')).toMatchObject({
      word: 'œuvre',
      sourceUrl: 'https://fr.wiktionary.org/wiki/%C5%93uvre',
    })
  })

  it('encodes multi-word titles like Wiktionary URLs', async () => {
    inlinePages['pomme de terre'] = { wikitext: page('* [[patate]]') }
    const { lookupSynonyms } = await loadLexicon()
    expect((await lookupSynonyms('pomme de terre')).sourceUrl).toBe(
      'https://fr.wiktionary.org/wiki/pomme_de_terre',
    )
  })

  it('returns nothing for a missing page and throws on an HTTP error', async () => {
    const { lookupSynonyms } = await loadLexicon()
    await expect(lookupSynonyms('xyzzyq')).resolves.toEqual({
      word: null,
      groups: [],
      sourceUrl: null,
    })
    fetchMock.mockImplementationOnce(() => Promise.resolve(new Response('', { status: 503 })))
    await expect(lookupSynonyms('vif')).rejects.toThrow('503')
  })
})

function page(...lines: string[]) {
  return [
    '== {{langue|fr}} ==',
    '=== {{S|nom|fr}} ===',
    '==== {{S|synonymes}} ====',
    ...lines,
  ].join('\n')
}
