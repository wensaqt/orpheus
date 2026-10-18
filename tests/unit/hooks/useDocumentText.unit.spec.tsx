import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { documentOf, paragraphNode } from '../../helpers/lexicalContent'
import type { LexicalContent } from '@front/_features/binder/types'
import type { ActionResult } from '@front/_lib/actionResult'
import { readDraft } from '@front/_features/binder/documentDraft'

const revision = 'a'.repeat(64)
const original = documentOf([paragraphNode('Original')])
const newer = documentOf([paragraphNode('Newer edits')])
const save = vi.fn()
const queue = vi.fn()
let current = original
let persist: (content: LexicalContent) => Promise<ActionResult<unknown>>
let update: () => void
const editor = {
  registerUpdateListener: (listener: () => void) => {
    update = listener
    return vi.fn()
  },
  parseEditorState: vi.fn(),
  setEditorState: vi.fn(),
}

vi.doMock('@lexical/react/LexicalComposerContext', () => ({
  useLexicalComposerContext: () => [editor],
}))
vi.doMock('@/lib/contentRevision', () => ({ contentRevision: async () => revision }))
vi.doMock('@front/_features/binder/actions', () => ({ saveDocument: save }))
vi.doMock('@front/compositions/[id]/_components/binder/state/BinderProvider', () => ({
  useBinder: () => ({ ownerId: 'owner' }),
}))
vi.doMock('@front/_components/editor/storedContent', () => ({
  readContent: () => current,
  toEditorStateJson: vi.fn(),
}))
vi.doMock('@front/_components/editor/contentUpdates', () => ({ isContentUpdate: () => true }))
vi.doMock('@front/_features/binder/documentStore', () => ({
  documentCacheGeneration: () => 0,
  rememberDocument: vi.fn(),
  useDocumentSlot: () => undefined,
}))
vi.doMock('@front/_components/editor/plugins/AutosavePlugin', () => ({
  useAutosavePlugin: (callback: typeof persist) => {
    persist = callback
    return { queue, status: 'pending' }
  },
}))
const { useDocumentText } =
  await import('@front/compositions/[id]/_components/document/useDocumentText')

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
  current = original
})
afterEach(cleanup)

it('does not let an old save remove the draft written after reopening the document', async () => {
  let finish!: (result: ActionResult<unknown>) => void
  save.mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve
    }),
  )
  const first = renderHook(() => useDocumentText('doc', { content: original, updatedAt: '' }))
  const pending = persist(original)
  await act(async () => {})
  first.unmount()
  renderHook(() => useDocumentText('doc', { content: original, updatedAt: '' }))
  current = newer
  await act(async () => {
    update()
  })
  expect(readDraft('owner', 'doc')?.content).toEqual(newer)
  await act(async () => {
    finish({ status: 'done', data: { revision, updatedAt: '2026-10-15T10:00:00Z' } })
    await pending
  })
  expect(readDraft('owner', 'doc')?.content).toEqual(newer)
})

it('clears the storage warning when a later edit can be preserved again', async () => {
  const { result } = renderHook(() => useDocumentText('doc', { content: original, updatedAt: '' }))
  const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
    throw new Error('Storage full')
  })
  await act(async () => {
    update()
  })
  expect(result.current.draftUnavailable).toBe(true)
  write.mockRestore()
  current = newer
  await act(async () => {
    update()
  })
  expect(result.current.draftUnavailable).toBe(false)
  expect(readDraft('owner', 'doc')?.content).toEqual(newer)
})
