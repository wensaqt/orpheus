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
  vi.clearAllMocks()
  clearDocuments()
  fetchDocument.mockResolvedValue(null)
  saveScore.mockResolvedValue({ status: 'done', data: { updatedAt: '2026-10-10T10:00:00.000Z' } })
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

it('preserves ordered snapshots and saves the current XML after imports and undo', async () => {
  render(<ScoreDocumentLoader id="1" initial={initial} />)
  const first = SAMPLE_SCORE.replace('Piano', 'Violin')
  const second = SAMPLE_SCORE.replace('Piano', 'Cello')
  await importXml(first)
  await importXml(second)
  await flushContent()
  expect(saveScore).toHaveBeenLastCalledWith('1', second)
  act(() => commands.setPanel('transpose'))
  fireEvent.click(screen.getByRole('button', { name: 'score.preview' }))
  expect(renderer.xml).not.toBe(second)
  act(() => commands.undo())
  await flushContent()
  expect(renderer.xml).toBe(first)
  expect(saveScore).toHaveBeenLastCalledWith('1', first)
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
  expect(saveScore).toHaveBeenLastCalledWith('1', corrected)
  act(() => commands.undo())
  await flushContent()
  expect(saveScore).toHaveBeenLastCalledWith('1', SAMPLE_SCORE)
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

it('caches the XML sent by a save, even if another edit happens during the request', async () => {
  render(<ScoreDocumentLoader id="1" initial={initial} />)
  const { result: cached } = renderHook(() => useDocumentSlot('1'))
  const first = SAMPLE_SCORE.replace('Piano', 'Violin')
  const second = SAMPLE_SCORE.replace('Piano', 'Cello')
  await importXml(first)
  let finish!: (value: { status: 'done'; data: { updatedAt: string } }) => void
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
    finish({ status: 'done', data: { updatedAt: '2026-10-10T10:00:00.000Z' } })
    await saving
  })
  expect(cached.current).toMatchObject({ status: 'ready', document: { scoreXml: first } })
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
