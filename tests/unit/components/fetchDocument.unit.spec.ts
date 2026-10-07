import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchDocument } from '@front/_features/binder/fetchDocument'
import { uuid } from '../../helpers/ids'

describe('fetchDocument', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('rejects malformed content and a response belonging to another document', async () => {
    const response = { id: uuid(2), title: 'Draft', updatedAt: '2026-10-06', content: null }
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    for (const document of [
      { ...response, id: uuid(3) },
      { ...response, content: { root: [] } },
    ]) {
      fetch.mockResolvedValue({ ok: true, status: 200, json: async () => document })
      await expect(fetchDocument(uuid(1), uuid(2))).rejects.toThrow('invalid response')
    }
  })

  it('distinguishes an unreadable document from a server failure', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    fetch.mockResolvedValue({ ok: false, status: 404 })
    await expect(fetchDocument(uuid(1), uuid(2))).resolves.toBeNull()
    fetch.mockResolvedValue({ ok: false, status: 503 })
    await expect(fetchDocument(uuid(1), uuid(2))).rejects.toThrow('HTTP 503')
  })
})
