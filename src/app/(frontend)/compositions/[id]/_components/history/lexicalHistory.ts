import { createEmptyHistoryState, registerHistory } from '@lexical/history'
import {
  CLEAR_HISTORY_COMMAND,
  COMMAND_PRIORITY_HIGH,
  type EditorState,
  HISTORIC_TAG,
  type LexicalEditor,
  mergeRegister,
  REDO_COMMAND,
  UNDO_COMMAND,
} from 'lexical'
import type { Id } from '@/lib/ids'
import { isContentUpdate } from '@front/_components/editor/contentUpdates'
import { HISTORY_MERGE_DELAY_MS } from '@front/_components/editor/history'
import { MAX_HISTORY_STEPS, type HistoryStore } from './historyStore'

const EDITOR_READY_TIMEOUT_MS = 5000
type Restore = (expected: EditorState, target: EditorState, source: LexicalEditor) => boolean
// Mounted editors are replaceable; history entries survive document navigation.
const editors = new WeakMap<HistoryStore, Map<Id, Restore>>()
const ready = new WeakMap<HistoryStore, Map<Id, Set<(restore: Restore | null) => void>>>()

function waitForEditor(history: HistoryStore, id: Id): Promise<Restore | null> {
  const mounted = editors.get(history)?.get(id)
  if (mounted) return Promise.resolve(mounted)
  return new Promise((resolve) => {
    const waiting = ready.get(history) ?? new Map()
    ready.set(history, waiting)
    const callbacks = waiting.get(id) ?? new Set()
    waiting.set(id, callbacks)
    const finish = (restore: Restore | null) => {
      clearTimeout(timeout)
      callbacks.delete(finish)
      if (!callbacks.size) waiting.delete(id)
      resolve(restore)
    }
    const timeout = setTimeout(() => finish(null), EDITOR_READY_TIMEOUT_MS)
    callbacks.add(finish)
  })
}

// Lexical groups typing; the composition coordinator orders text, layout and binder actions.
export function registerCompositionHistory(editor: LexicalEditor, id: Id, history: HistoryStore) {
  const native = createEmptyHistoryState()
  native.current = { editor, editorState: editor.getEditorState() }
  let contentChanged = false
  const groups = new WeakMap<object, { before: EditorState; after: EditorState }>()
  const restoreHere: Restore = (expected, target, source) => {
    if (JSON.stringify(editor.getEditorState().toJSON()) !== JSON.stringify(expected.toJSON()))
      return false
    // States from this composer retain the selection. Another composer needs its own node keys.
    const restored = source === editor ? target : editor.parseEditorState(target.toJSON())
    native.undoStack = []
    native.redoStack = []
    native.current = { editor, editorState: restored }
    editor.setEditorState(restored, { tag: HISTORIC_TAG })
    if (source !== editor) editor.focus(undefined, { defaultSelection: 'rootEnd' })
    return true
  }
  const mounted = editors.get(history) ?? new Map()
  editors.set(history, mounted)
  mounted.set(id, restoreHere)
  ready
    .get(history)
    ?.get(id)
    ?.forEach((notify) => notify(restoreHere))
  const restore = async (expected: EditorState, target: EditorState) => {
    if (!mounted.has(id) && !(await history.openDocument(id))) return false
    const active = await waitForEditor(history, id)
    return active?.(expected, target, editor) ?? false
  }
  const stop = mergeRegister(
    editor.registerUpdateListener((update) => {
      contentChanged = isContentUpdate(update) && !update.tags.has(HISTORIC_TAG)
    }),
    // Split typing around other actions using the public clock option.
    registerHistory(
      editor,
      native,
      HISTORY_MERGE_DELAY_MS,
      () => Date.now() + history.mergeBarrier * (HISTORY_MERGE_DELAY_MS + 1),
      ({ current, undoStack }) => {
        if (!current || !contentChanged) return
        contentChanged = false
        const previous = undoStack.at(-1)
        if (!previous) return
        const group = groups.get(previous) ?? {
          before: previous.editorState,
          after: current.editorState,
        }
        group.after = current.editorState
        groups.set(previous, group)
        history.record(
          {
            scope: { kind: 'text', id },
            undo: () => restore(group.after, group.before),
            redo: () => restore(group.before, group.after),
          },
          previous,
        )
      },
      MAX_HISTORY_STEPS,
    ),
    editor.registerCommand(
      UNDO_COMMAND,
      () => {
        void history.undo()
        return true
      },
      COMMAND_PRIORITY_HIGH,
    ),
    editor.registerCommand(
      REDO_COMMAND,
      () => {
        void history.redo()
        return true
      },
      COMMAND_PRIORITY_HIGH,
    ),
    editor.registerCommand(
      CLEAR_HISTORY_COMMAND,
      () => {
        history.discard((scope) => scope.kind === 'text' && scope.id === id)
        return false
      },
      COMMAND_PRIORITY_HIGH,
    ),
    history.subscribe(() => editor.setEditable(!history.getSnapshot().busy)),
  )
  return () => {
    if (mounted.get(id) === restoreHere) mounted.delete(id)
    stop()
  }
}
