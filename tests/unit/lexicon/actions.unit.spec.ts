// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.fn()
const lookupSynonyms = vi.fn()
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('@/payload.config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: async () => ({ auth }) }))
vi.mock('@front/_features/lexicon/lexicon', () => ({ lookupSynonyms }))

const { findSynonyms } = await import('@front/_features/lexicon/actions')

describe('findSynonyms', () => {
  beforeEach(() => {
    auth.mockReset().mockResolvedValue({ user: { id: 1 } })
    lookupSynonyms.mockReset().mockResolvedValue({ word: 'vif', groups: [] })
  })

  it('rejects anonymous calls without querying Wiktionary', async () => {
    auth.mockResolvedValue({ user: null })
    await expect(findSynonyms('vif')).rejects.toThrow('Unauthorized')
    expect(lookupSynonyms).not.toHaveBeenCalled()
  })

  it('looks up the normalised query', async () => {
    await expect(findSynonyms('  VIF ')).resolves.toMatchObject({ query: 'vif', word: 'vif' })
    expect(lookupSynonyms).toHaveBeenCalledWith(expect.objectContaining({ user: { id: 1 } }), 'vif')
  })

  it('returns an empty result for unusable input, without a lookup', async () => {
    // The last one is not text, on purpose: the action is a public endpoint
    for (const input of ['   ', 'x'.repeat(61), 42 as unknown as string]) {
      await expect(findSynonyms(input)).resolves.toEqual({
        query: '',
        word: null,
        groups: [],
        more: [],
        sourceUrl: null,
      })
    }
    expect(lookupSynonyms).not.toHaveBeenCalled()
  })
})
