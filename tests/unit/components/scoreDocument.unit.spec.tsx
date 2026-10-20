import { webcrypto } from 'node:crypto'
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'

import { SAMPLE_SCORE } from '@/lib/scores/sample'
import type { ScoreRenderer } from '@front/_components/scores/ScoreRenderer'
import type { SaveControls } from '@front/_hooks/useAutosave'

const saveScore = vi.fn()
const rename = vi.fn()
const createVariant = vi.fn()
const setTitle = vi.fn()
const verify = vi.fn()
const fetchDocument = vi.fn()
const savers = new Map<string, SaveControls>()
const confirm = vi.fn()
let commands: import('@front/compositions/[id]/_components/score/ScoreCommands').ScoreCommands
let renderer: ComponentProps<typeof ScoreRenderer>
let generation = 0
let titleSlot: HTMLElement
const binderCommands = { createScoreTransposition: createVariant, setTitle }

vi.doMock('@front/_features/binder/actions', () => ({
  saveScoreDocument: saveScore,
  renameBinderItem: rename,
}))
vi.doMock('@front/_features/binder/fetchDocument', () => ({ fetchDocument }))
vi.doMock('@front/compositions/[id]/_components/binder/state/BinderProvider', () => ({
  useBinder: () => ({
    compositionId: '10',
    entries: [{ id: '1', title: 'Study', documentType: 'score' }],
    commands: binderCommands,
  }),
  useRegisterSaver: (key: string, saver: SaveControls) => savers.set(key, saver),
}))
vi.doMock('@front/compositions/[id]/_components/history/HistoryProvider', () => ({
  useHistoryState: () => ({ generation, busy: false }),
}))
vi.doMock('@front/compositions/[id]/_components/header/documentTitleSlot', () => ({
  useDocumentTitleSlot: () => titleSlot,
}))
vi.doMock('@front/_components/i18n/I18nProvider', () => ({ useT: () => (key: string) => key }))
vi.doMock('next/navigation', () => ({ usePathname: () => '/compositions/10/1' }))
vi.doMock('@front/_components/ui/Feedback/ConfirmProvider', () => ({ useConfirm: () => confirm }))
vi.doMock('@front/compositions/[id]/_components/score/ScoreCommands', () => ({
  useRegisterScoreCommands: (next: typeof commands) => {
    commands = next
  },
}))
vi.doMock('@front/_components/scores/scoreRenderValidation', () => ({ verifyScoreRender: verify }))
vi.doMock('@front/_components/scores/ScoreRenderer', () => ({
  ScoreRenderer: (props: typeof renderer) => {
    renderer = props
    return <button onClick={() => props.onNoteClick?.(0)}>Pick note</button>
  },
}))

const { ScoreDocumentLoader } =
  await import('@front/compositions/[id]/_components/score/ScoreDocumentLoader')
const { useScoreDocument } =
  await import('@front/compositions/[id]/_components/score/useScoreDocument')
const { clearDocuments, useDocumentSlot } = await import('@front/_features/binder/documentStore')
const initial = {
  id: '1',
  title: 'Study',
  updatedAt: '',
  content: null,
  documentType: 'score' as const,
  scoreXml: SAMPLE_SCORE,
  checkedAt: Date.now(),
}
beforeEach(() => {
  vi.stubGlobal('crypto', webcrypto)
  vi.clearAllMocks()
  confirm.mockResolvedValue(false)
  clearDocuments()
  fetchDocument.mockResolvedValue(null)
  saveScore.mockResolvedValue({
    status: 'done',
    data: { updatedAt: '2026-10-10T10:00:00.000Z', revision: 'a'.repeat(64) },
  })
  rename.mockResolvedValue({ status: 'done', data: {} })
  verify.mockResolvedValue(undefined)
  createVariant.mockResolvedValue({})
  savers.clear()
  generation = 0
  titleSlot = document.createElement('div')
  document.body.append(titleSlot)
})
afterEach(() => {
  cleanup()
  titleSlot.remove()
})

async function importXml(xml: string) {
  const input = screen.getByLabelText('score.importMusicXml')
  fireEvent.change(input, {
    target: {
      files: [
        {
          name: 'study.musicxml',
          size: xml.length,
          text: async () => xml,
        },
      ],
    },
  })
  await act(async () => {})
}
async function flushContent() {
  await act(async () => {
    await savers.get('document:1')!.flush()
  })
}

it('keeps unsaved XML while signing in in another tab, then retries the pending score', async () => {
  render(<ScoreDocumentLoader id="1" initial={initial} />)
  const changed = SAMPLE_SCORE.replace('Piano', 'Violin')
  await importXml(changed)
  saveScore.mockResolvedValueOnce({ status: 'error', reason: 'session-expired' })
  await flushContent()
  expect(screen.getByRole('alert').textContent).toContain('score.sessionExpired')
  const link = screen.getByRole('link', { name: 'score.logInNewTab' })
  expect(link.getAttribute('target')).toBe('_blank')
  expect(link.getAttribute('href')).toContain('/login')
  expect(renderer.xml).toBe(changed)
  fireEvent.click(screen.getByRole('button', { name: 'score.retrySave' }))
  await act(async () => {})
  expect(screen.queryByRole('alert')).toBeNull()
  expect(saveScore).toHaveBeenLastCalledWith(expect.objectContaining({ scoreXml: changed }))
})

it('offers export and confirmed reload for a conflict without overwriting the saved score', async () => {
  render(<ScoreDocumentLoader id="1" initial={initial} />)
  await importXml(SAMPLE_SCORE.replace('Piano', 'Violin'))
  saveScore.mockResolvedValueOnce({ status: 'error', reason: 'conflict' })
  await flushContent()
  expect(screen.getByRole('alert').textContent).toContain('score.saveConflict')
  expect(screen.getByRole('button', { name: 'editor.downloadDraft' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'score.retrySave' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'editor.loadSavedVersion' }))
  await act(async () => {})
  expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ title: 'score.discardChanges' }))
  expect(renderer.xml).toContain('Violin')
  expect(saveScore).toHaveBeenCalledOnce()
})

it('reports a blocked title save and retries it after login without changing the score', async () => {
  render(<ScoreDocumentLoader id="1" initial={initial} />)
  rename.mockResolvedValueOnce({ status: 'error', reason: 'session-expired' })
  fireEvent.change(screen.getByLabelText('editor.documentTitleLabel'), {
    target: { value: 'Renamed' },
  })
  await act(async () => {
    await savers.get('document-title:1')!.flush()
  })
  expect(screen.getByRole('alert').textContent).toContain('score.sessionExpired')
  fireEvent.click(screen.getByRole('button', { name: 'score.retrySave' }))
  await act(async () => {})
  expect(rename).toHaveBeenLastCalledWith('1', 'Renamed')
  expect(screen.queryByRole('alert')).toBeNull()
  expect(saveScore).not.toHaveBeenCalled()
})

it('preserves ordered snapshots and saves the current XML after imports and undo', async () => {
  render(<ScoreDocumentLoader id="1" initial={initial} />)
  const first = SAMPLE_SCORE.replace('Piano', 'Violin')
  const second = SAMPLE_SCORE.replace('Piano', 'Cello')
  await importXml(first)
  await importXml(second)
  await flushContent()
  expect(saveScore).toHaveBeenLastCalledWith({
    id: '1',
    scoreXml: second,
    expectedRevision: expect.stringMatching(/^[a-f0-9]{64}$/),
  })
  act(() => commands.setPanel('transpose'))
  fireEvent.click(screen.getByRole('button', { name: 'score.preview' }))
  expect(renderer.xml).not.toBe(second)
  act(() => commands.undo())
  await flushContent()
  expect(renderer.xml).toBe(first)
  expect(saveScore).toHaveBeenLastCalledWith({
    id: '1',
    scoreXml: first,
    expectedRevision: expect.stringMatching(/^[a-f0-9]{64}$/),
  })
  expect(commands.canRedo).toBe(true)
  act(() => commands.redo())
  await flushContent()
  expect(renderer.xml).toBe(second)
  expect(saveScore).toHaveBeenLastCalledWith({
    id: '1',
    scoreXml: second,
    expectedRevision: expect.stringMatching(/^[a-f0-9]{64}$/),
  })
  act(() => commands.undo())
  act(() => commands.undo())
  expect(renderer.xml).toBe(SAMPLE_SCORE)
  expect(commands.canUndo).toBe(false)
})

it('keeps import errors on close but clears them on menu opening and note selection', async () => {
  render(<ScoreDocumentLoader id="1" initial={initial} />)
  act(() => commands.setPanel('correct'))
  verify.mockRejectedValue(new Error('Unreadable notation'))
  await importXml(SAMPLE_SCORE)
  expect(screen.getByRole('alert').textContent).toBe('Unreadable notation')
  fireEvent.click(screen.getByRole('button', { name: 'score.closePanel' }))
  expect(screen.getByRole('alert')).toBeTruthy()
  act(() => commands.setPanel('correct'))
  expect(screen.queryByRole('alert')).toBeNull()
  await importXml(SAMPLE_SCORE)
  fireEvent.keyDown(screen.getByText('Pick note'), { key: 'Escape' })
  expect(screen.getByRole('alert')).toBeTruthy()
  fireEvent.click(screen.getByText('Pick note'))
  expect(screen.queryByRole('alert')).toBeNull()
  expect(document.querySelectorAll('[data-note-index]')).toHaveLength(1)
  expect(commands.canUndo).toBe(false)
})

it('creates a variant only from a rendered preview and never saves it over the source', async () => {
  render(<ScoreDocumentLoader id="1" initial={initial} />)
  act(() => commands.setPanel('transpose'))
  fireEvent.click(screen.getByRole('button', { name: 'score.preview' }))
  const preview = renderer.xml
  expect(preview).not.toBe(SAMPLE_SCORE)
  expect(renderer.onNoteClick).toBeUndefined()
  expect(screen.getByRole('button', { name: 'score.apply' }).hasAttribute('disabled')).toBe(true)
  act(() => renderer.onRenderState?.({ xml: preview, status: 'ready' }))
  fireEvent.click(screen.getByRole('button', { name: 'score.apply' }))
  await act(async () => {})
  expect(createVariant).toHaveBeenCalledWith('1', preview, { mode: 'key', intervalIndex: 1 })
  await flushContent()
  expect(saveScore).not.toHaveBeenCalled()
  act(() => commands.setPanel('correct'))
  expect(renderer.xml).toBe(SAMPLE_SCORE)
})

it('retains title savers and resets the title field with history generation', () => {
  const view = render(<ScoreDocumentLoader id="1" initial={initial} />)
  const title = screen.getByLabelText('editor.documentTitleLabel')
  fireEvent.change(title, { target: { value: '' } })
  generation++
  view.rerender(<ScoreDocumentLoader id="1" initial={initial} />)
  expect((title as HTMLInputElement).value).toBe('Study')
  expect([...savers.keys()]).toEqual(['document:1', 'document-title:1'])
})

it('rejects an invalid pitch without a snapshot, then saves and undoes a valid correction', async () => {
  const { result } = renderHook(() =>
    useScoreDocument({ id: '1', title: 'Study', initialXml: SAMPLE_SCORE }),
  )
  act(() => result.current.panelProps.correction.onEdit(0, { step: 'G', alter: 3, octave: 4 }))
  expect(result.current.error).toBeTruthy()
  expect(result.current.rendererProps.xml).toBe(SAMPLE_SCORE)
  expect(commands.canUndo).toBe(false)
  await flushContent()
  expect(saveScore).not.toHaveBeenCalled()

  act(() => result.current.panelProps.correction.onEdit(0, { step: 'G', alter: 0, octave: 5 }))
  const corrected = result.current.rendererProps.xml
  expect(corrected).not.toBe(SAMPLE_SCORE)
  expect(result.current.error).toBeNull()
  expect(commands.canUndo).toBe(true)
  await flushContent()
  expect(saveScore).toHaveBeenLastCalledWith({
    id: '1',
    scoreXml: corrected,
    expectedRevision: expect.stringMatching(/^[a-f0-9]{64}$/),
  })
  act(() => commands.undo())
  await flushContent()
  expect(saveScore).toHaveBeenLastCalledWith({
    id: '1',
    scoreXml: SAMPLE_SCORE,
    expectedRevision: expect.stringMatching(/^[a-f0-9]{64}$/),
  })
})

it('keeps both pitch corrections made before React rerenders', () => {
  const { result } = renderHook(() =>
    useScoreDocument({ id: '1', title: 'Study', initialXml: SAMPLE_SCORE }),
  )
  act(() => {
    result.current.panelProps.correction.onEdit(0, { step: 'D', alter: 0, octave: 5 })
    result.current.panelProps.correction.onEdit(1, { step: 'E', alter: 0, octave: 5 })
  })
  const xml = new DOMParser().parseFromString(result.current.rendererProps.xml, 'application/xml')
  expect(
    Array.from(xml.querySelectorAll('part > measure > note > pitch > step'))
      .slice(0, 2)
      .map((step) => step.textContent),
  ).toEqual(['D', 'E'])
  act(() => commands.undo())
  expect(result.current.rendererProps.xml).toContain('<step>D</step>')
  act(() => commands.undo())
  expect(result.current.rendererProps.xml).toBe(SAMPLE_SCORE)
})

it('adds and deletes measures through the panel, then saves, undoes and redoes the edits', async () => {
  render(<ScoreDocumentLoader id="1" initial={initial} />)
  act(() => commands.setPanel('measures'))
  const selection = screen.getByLabelText('score.selectedMeasure')
  expect(selection.querySelectorAll('option')).toHaveLength(2)
  fireEvent.click(screen.getByRole('button', { name: 'score.appendMeasure' }))
  expect(selection.querySelectorAll('option')).toHaveLength(3)
  await flushContent()
  expect(saveScore).toHaveBeenLastCalledWith(expect.objectContaining({ scoreXml: renderer.xml }))
  const appended = renderer.xml
  fireEvent.change(selection, { target: { value: '0' } })
  fireEvent.click(screen.getByRole('button', { name: 'score.deleteMeasure' }))
  expect(selection.querySelectorAll('option')).toHaveLength(2)
  const deleted = renderer.xml
  expect(deleted).not.toBe(appended)
  act(() => commands.undo())
  expect(renderer.xml).toBe(appended)
  act(() => commands.redo())
  expect(renderer.xml).toBe(deleted)
  await flushContent()
  expect(saveScore).toHaveBeenLastCalledWith(expect.objectContaining({ scoreXml: deleted }))
  fireEvent.click(screen.getByRole('button', { name: 'score.deleteMeasure' }))
  expect(selection.querySelectorAll('option')).toHaveLength(1)
  expect(screen.getByRole('button', { name: 'score.deleteMeasure' }).hasAttribute('disabled')).toBe(
    true,
  )
})

it('keeps XML and history intact when measure deletion is unsafe', () => {
  const xml = SAMPLE_SCORE.replace(
    '<type>quarter</type>',
    '<tie type="start"/><type>quarter</type>',
  )
  const { result } = renderHook(() =>
    useScoreDocument({ id: '1', title: 'Study', initialXml: xml }),
  )
  act(() => result.current.panelProps.measures.onEdit({ type: 'delete', index: 0 }))
  expect(result.current.error).toBe('score.errors.unsupportedMeasureStructure')
  expect(result.current.rendererProps.xml).toBe(xml)
  expect(commands.canUndo).toBe(false)
})

it('shares measure selection with correction, context actions and undo', async () => {
  const { result } = renderHook(() =>
    useScoreDocument({ id: '1', title: 'Study', initialXml: SAMPLE_SCORE }),
  )
  act(() => result.current.rendererProps.onMeasureClick?.(1))
  expect(result.current.rendererProps.selectedMeasure).toBe(1)
  expect(result.current.measureActions?.measure.number).toBe('2')
  act(() => result.current.measureActions?.onCorrect())
  expect(result.current.panelProps.correction.notes.map((note) => note.index)).toEqual([4, 5, 6])
  expect(result.current.panelProps.correction.showAll).toBe(true)
  act(() => result.current.panelProps.measures.onEdit({ type: 'duplicate', index: 1 }))
  expect(result.current.rendererProps.selectedMeasure).toBe(2)
  expect(result.current.rendererProps.xml.match(/<pitch>/g)).toHaveLength(10)
  await flushContent()
  expect(saveScore).toHaveBeenLastCalledWith(
    expect.objectContaining({ scoreXml: result.current.rendererProps.xml }),
  )
  act(() => commands.undo())
  expect(result.current.rendererProps.xml).toBe(SAMPLE_SCORE)
  expect(result.current.rendererProps.selectedMeasure).toBeNull()
  act(() => commands.redo())
  expect(result.current.rendererProps.xml.match(/<pitch>/g)).toHaveLength(10)
  expect(result.current.rendererProps.selectedMeasure).toBeNull()
})

it('handles undo and redo shortcuts outside editable fields', async () => {
  render(<ScoreDocumentLoader id="1" initial={initial} />)
  const changed = SAMPLE_SCORE.replace('Piano', 'Violin')
  await importXml(changed)
  const score = screen.getByText('Pick note')
  fireEvent.keyDown(score, { key: 'z', ctrlKey: true })
  expect(renderer.xml).toBe(SAMPLE_SCORE)
  fireEvent.keyDown(score, { key: 'Z', ctrlKey: true, shiftKey: true })
  expect(renderer.xml).toBe(changed)
  act(() => commands.setPanel('correct'))
  fireEvent.keyDown(screen.getAllByRole('combobox')[0], { key: 'z', ctrlKey: true })
  expect(renderer.xml).toBe(changed)
})

it('reopens the saved score instead of its stale server snapshot', async () => {
  const view = render(<ScoreDocumentLoader id="1" initial={initial} />)
  const changed = SAMPLE_SCORE.replace('Piano', 'Violin')
  await importXml(changed)
  await flushContent()
  view.unmount()
  render(<ScoreDocumentLoader id="1" initial={initial} />)
  expect(renderer.xml).toBe(changed)
})

it('keeps native undo in the title and numeric drafts', () => {
  render(<ScoreDocumentLoader id="1" initial={initial} />)
  act(() => commands.setPanel('correct'))
  const titleUndo = new KeyboardEvent('keydown', {
    key: 'z',
    ctrlKey: true,
    bubbles: true,
    cancelable: true,
  })
  fireEvent(screen.getByLabelText('editor.documentTitleLabel'), titleUndo)
  expect(titleUndo.defaultPrevented).toBe(false)
  const input = document.querySelector('input[type=number]')!
  const pitchUndo = new KeyboardEvent('keydown', {
    key: 'z',
    metaKey: true,
    bubbles: true,
    cancelable: true,
  })
  fireEvent(input, pitchUndo)
  expect(pitchUndo.defaultPrevented).toBe(false)
})

it('drains later edits before a navigation flush completes', async () => {
  render(<ScoreDocumentLoader id="1" initial={initial} />)
  const { result: cached } = renderHook(() => useDocumentSlot('1'))
  const first = SAMPLE_SCORE.replace('Piano', 'Violin')
  const second = SAMPLE_SCORE.replace('Piano', 'Cello')
  await importXml(first)
  let finish!: (value: { status: 'done'; data: { updatedAt: string; revision: string } }) => void
  saveScore.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  let saving!: Promise<boolean>
  await act(async () => {
    saving = savers.get('document:1')!.flush()
  })
  await importXml(second)
  await act(async () => {
    finish({
      status: 'done',
      data: { updatedAt: '2026-10-10T10:00:00.000Z', revision: 'a'.repeat(64) },
    })
    await saving
  })
  expect(saveScore).toHaveBeenNthCalledWith(1, {
    id: '1',
    scoreXml: first,
    expectedRevision: expect.any(String),
  })
  expect(saveScore).toHaveBeenNthCalledWith(2, {
    id: '1',
    scoreXml: second,
    expectedRevision: expect.any(String),
  })
  expect(cached.current).toMatchObject({ status: 'ready', document: { scoreXml: second } })
  expect(renderer.xml).toBe(second)
})

it('suspends score edits and undo until import verification completes', async () => {
  render(<ScoreDocumentLoader id="1" initial={initial} />)
  await importXml(SAMPLE_SCORE.replace('Piano', 'Violin'))
  act(() => commands.setPanel('correct'))
  let finish!: () => void
  verify.mockReturnValueOnce(
    new Promise<void>((resolve) => {
      finish = resolve
    }),
  )
  await importXml(SAMPLE_SCORE.replace('Piano', 'Cello'))
  expect(screen.getByRole('status').textContent).toBe('score.importing')
  expect(document.querySelector('fieldset[disabled]')).not.toBeNull()
  expect(commands.canUndo).toBe(false)
  const before = renderer.xml
  act(() => commands.undo())
  expect(renderer.xml).toBe(before)
  await act(async () => {
    finish()
  })
  expect(screen.queryByRole('status')).toBeNull()
  expect(renderer.xml).toContain('Cello')
  expect(commands.canUndo).toBe(true)
})

it('retries a failed score load without leaving the editor', async () => {
  fetchDocument.mockRejectedValueOnce(new Error('offline'))
  render(<ScoreDocumentLoader id="1" />)
  await screen.findByRole('alert')
  fetchDocument.mockResolvedValueOnce(initial)
  fireEvent.click(screen.getByRole('button', { name: 'editor.retry' }))
  await screen.findByText('Pick note')
  expect(renderer.xml).toBe(SAMPLE_SCORE)
})

it('clears an import error when the current XML is imported again without creating an undo step', async () => {
  render(<ScoreDocumentLoader id="1" initial={initial} />)
  verify.mockRejectedValueOnce(new Error('Unreadable notation'))
  await importXml(SAMPLE_SCORE)
  expect(screen.getByRole('alert')).toBeTruthy()
  await importXml(SAMPLE_SCORE)
  expect(screen.queryByRole('alert')).toBeNull()
  expect(commands.canUndo).toBe(false)
})

it('adds two notes against the latest XML, deletes one, saves and restores both history states', async () => {
  const { result } = renderHook(() =>
    useScoreDocument({ id: '1', title: 'Study', initialXml: SAMPLE_SCORE }),
  )
  act(() => result.current.panelProps.measures.onEdit({ type: 'append' }))
  act(() => result.current.rendererProps.onMeasureClick?.(2))
  expect(result.current.measureActions?.canAddNote).toBe(true)
  const add = result.current.measureActions!.onAddNote
  act(() => {
    add()
    add()
  })
  expect(result.current.rendererProps.xml.match(/<pitch>/g)).toHaveLength(9)
  const added = result.current.rendererProps.xml
  act(() => result.current.rendererProps.onNoteClick?.(7))
  expect(result.current.panelProps.correction.selectedIndex).toBe(7)
  act(() => result.current.panelProps.correction.onDelete(7))
  expect(result.current.panelProps.correction.selectedIndex).toBeNull()
  expect(result.current.rendererProps.xml.match(/<pitch>/g)).toHaveLength(8)
  const deleted = result.current.rendererProps.xml
  await flushContent()
  expect(saveScore).toHaveBeenLastCalledWith(expect.objectContaining({ scoreXml: deleted }))
  act(() => commands.undo())
  expect(result.current.rendererProps.xml).toBe(added)
  act(() => commands.redo())
  expect(result.current.rendererProps.xml).toBe(deleted)
  await flushContent()
  expect(saveScore).toHaveBeenLastCalledWith(expect.objectContaining({ scoreXml: deleted }))
})

it('does not save or create history for refused note edits', async () => {
  const { result } = renderHook(() =>
    useScoreDocument({ id: '1', title: 'Study', initialXml: SAMPLE_SCORE }),
  )
  act(() => result.current.panelProps.correction.onDelete(99))
  expect(result.current.error).toBe('score.errors.noteMissing')
  expect(result.current.rendererProps.xml).toBe(SAMPLE_SCORE)
  expect(commands.canUndo).toBe(false)
  await flushContent()
  expect(saveScore).not.toHaveBeenCalled()
})

it('blocks captured add and delete commands while an import is being verified', async () => {
  let documentState!: ReturnType<typeof useScoreDocument>
  function ImportHarness() {
    documentState = useScoreDocument({ id: '1', title: 'Study', initialXml: SAMPLE_SCORE })
    return (
      <input aria-label="score.importMusicXml" type="file" onChange={documentState.importFile} />
    )
  }
  render(<ImportHarness />)
  act(() => documentState.panelProps.measures.onEdit({ type: 'append' }))
  act(() => documentState.rendererProps.onMeasureClick?.(2))
  const add = documentState.measureActions!.onAddNote
  const remove = documentState.panelProps.correction.onDelete
  const before = documentState.rendererProps.xml
  await flushContent()
  saveScore.mockClear()
  let finish!: () => void
  verify.mockReturnValueOnce(
    new Promise<void>((resolve) => {
      finish = resolve
    }),
  )
  await importXml(SAMPLE_SCORE.replace('Piano', 'Violin'))
  expect(documentState.isImporting).toBe(true)
  act(() => {
    add()
    remove(0)
  })
  expect(documentState.rendererProps.xml).toBe(before)
  await flushContent()
  expect(saveScore).not.toHaveBeenCalled()
  await act(async () => finish())
  expect(documentState.isImporting).toBe(false)
})
