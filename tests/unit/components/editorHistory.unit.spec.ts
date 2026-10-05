import { createEmptyHistoryState } from '@lexical/history'
import { act, renderHook } from '@testing-library/react'
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  CLEAR_HISTORY_COMMAND,
  createEditor,
} from 'lexical'
import { describe, expect, it } from 'vitest'

import {
  publishHistory,
  registerPublishedHistory,
  useHistoryAvailability,
} from '@front/_components/editor/history'

// A history with this many entries to undo and to redo
function historyWith(undo: number, redo: number) {
  const state = createEmptyHistoryState()
  const entry = { editor: createEditor(), editorState: createEditor().getEditorState() }
  state.undoStack.push(...Array.from({ length: undo }, () => entry))
  state.redoStack.push(...Array.from({ length: redo }, () => entry))
  return state
}

describe('history availability', () => {
  it('has nothing to undo or redo before the history speaks', () => {
    const { result } = renderHook(() => useHistoryAvailability(createEditor()))
    expect(result.current).toEqual({ canUndo: false, canRedo: false })
    expect(renderHook(() => useHistoryAvailability(null)).result.current.canUndo).toBe(false)
  })

  it('follows what the editor’s history publishes', () => {
    const editor = createEditor()
    const { result } = renderHook(() => useHistoryAvailability(editor))
    act(() => publishHistory(editor, historyWith(2, 0)))
    expect(result.current).toEqual({ canUndo: true, canRedo: false })
    act(() => publishHistory(editor, historyWith(1, 1)))
    expect(result.current).toEqual({ canUndo: true, canRedo: true })
    // Cleared (another tab's text shown): nothing either way
    act(() => publishHistory(editor, createEmptyHistoryState()))
    expect(result.current).toEqual({ canUndo: false, canRedo: false })
  })

  it('gives a late subscriber the current value at once', () => {
    const editor = createEditor()
    publishHistory(editor, historyWith(1, 0))
    expect(renderHook(() => useHistoryAvailability(editor)).result.current.canUndo).toBe(true)
  })

  it('keeps each editor’s history apart', () => {
    const first = createEditor()
    const second = createEditor()
    publishHistory(first, historyWith(1, 0))
    expect(renderHook(() => useHistoryAvailability(second)).result.current.canUndo).toBe(false)
  })

  it('follows a real editor’s history, through a change and a clear', () => {
    const editor = createEditor({
      onError: (error) => {
        throw error
      },
    })
    const unregister = registerPublishedHistory(editor, createEmptyHistoryState())
    const { result } = renderHook(() => useHistoryAvailability(editor))
    expect(result.current).toEqual({ canUndo: false, canRedo: false })

    // The first change is where the history starts; the next one can be undone
    const addParagraph = (text: string) =>
      act(() =>
        editor.update(
          () => $getRoot().append($createParagraphNode().append($createTextNode(text))),
          {
            discrete: true,
          },
        ),
      )
    addParagraph('Un')
    addParagraph('Deux')
    expect(result.current.canUndo).toBe(true)
    act(() => {
      editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined)
    })
    expect(result.current).toEqual({ canUndo: false, canRedo: false })
    unregister()
  })
})
