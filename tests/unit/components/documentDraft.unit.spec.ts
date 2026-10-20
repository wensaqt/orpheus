import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readDraft, removeDraft, writeDraft } from '@front/_features/binder/documentDraft'

const draft = {
  content: { root: { type: 'root' as const, children: [] } },
  revision: 'a'.repeat(64),
}
describe('document drafts', () => {
  beforeEach(() => sessionStorage.clear())
  it.each([
    '{',
    'null',
    'true',
    '123',
    '"text"',
    '[]',
    '{}',
    JSON.stringify({ content: draft.content }),
    JSON.stringify({ revision: draft.revision }),
    JSON.stringify({ content: null, revision: draft.revision }),
    JSON.stringify({ ...draft, revision: [draft.revision] }),
    JSON.stringify({ ...draft, revision: 'A'.repeat(64) }),
  ])('discards malformed stored drafts: %s', (stored) => {
    sessionStorage.setItem('orpheus-draft:alice:document', stored)
    expect(readDraft('alice', 'document')).toBeNull()
  })
  it('retains additional fields on a valid stored draft', () => {
    const stored = { ...draft, extra: { source: 'editor' } }
    sessionStorage.setItem('orpheus-draft:alice:document', JSON.stringify(stored))
    expect(readDraft('alice', 'document')).toEqual(stored)
  })
  it('survives editor navigation but is scoped to both account and document', () => {
    expect(writeDraft('alice', 'document', draft)).toBe(true)
    expect(readDraft('alice', 'document')).toEqual(draft)
    expect(readDraft('bob', 'document')).toBeNull()
    expect(readDraft('alice', 'another')).toBeNull()
    removeDraft('alice', 'document')
    expect(readDraft('alice', 'document')).toBeNull()
  })
  it('reports quota failures instead of promising a recoverable draft', () => {
    const store = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Quota')
    })
    expect(writeDraft('alice', 'document', draft)).toBe(false)
    store.mockRestore()
  })
})
