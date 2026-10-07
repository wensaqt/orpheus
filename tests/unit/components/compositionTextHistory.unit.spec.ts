import {
  $createParagraphNode,
  $getRoot,
  CLEAR_HISTORY_COMMAND,
  createEditor,
  HISTORY_MERGE_TAG,
} from 'lexical'
import { describe, expect, it } from 'vitest'
import type { Id } from '@/lib/ids'
import { createHistoryStore } from '@front/compositions/[id]/_components/history/historyStore'
import { registerCompositionHistory } from '@front/compositions/[id]/_components/history/lexicalHistory'

const id: Id = '01960000-0000-7000-8000-000000000001'
const otherId: Id = '01960000-0000-7000-8000-000000000002'
function emptyEditor() {
  const editor = createEditor({
    onError: (error) => {
      throw error
    },
  })
  editor.update(
    () => {
      $getRoot().append($createParagraphNode())
      $getRoot().selectEnd()
    },
    { discrete: true },
  )
  return editor
}
const type = (editor: ReturnType<typeof createEditor>, text: string) =>
  editor.update(() => $getRoot().selectEnd().insertText(text), { discrete: true })
const textOf = (editor: ReturnType<typeof createEditor>) =>
  editor.getEditorState().read(() => $getRoot().getTextContent())

describe('composition text history', () => {
  it('splits typing around a layout action and preserves the complete merged redo', async () => {
    const editor = emptyEditor()
    const history = createHistoryStore()
    const stop = registerCompositionHistory(editor, id, history)
    type(editor, 'a')
    type(editor, 'b')
    let margin = 40
    history.record({
      scope: { kind: 'layout' },
      undo: () => {
        margin = 25
        return true
      },
      redo: () => {
        margin = 40
        return true
      },
    })
    type(editor, 'c')
    type(editor, 'd')
    await history.undo()
    expect(textOf(editor)).toBe('ab')
    await history.undo()
    expect(margin).toBe(25)
    await history.undo()
    expect(textOf(editor)).toBe('')
    await history.redo()
    expect(textOf(editor)).toBe('ab')
    await history.redo()
    await history.redo()
    expect(textOf(editor)).toBe('abcd')
    expect(margin).toBe(40)
    stop()
  })

  it('clears only a replaced document’s history', () => {
    const editor = emptyEditor()
    const history = createHistoryStore()
    const stop = registerCompositionHistory(editor, id, history)
    type(editor, 'a')
    history.record({ scope: { kind: 'text', id: otherId }, undo: () => true, redo: () => true })
    editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined)
    expect(history.getSnapshot().canUndo).toBe(true)
    history.discard((scope) => scope.kind === 'text' && scope.id === otherId)
    expect(history.getSnapshot().canUndo).toBe(false)
    stop()
  })

  it('refuses to undo over text replaced outside the history', async () => {
    const editor = emptyEditor()
    const history = createHistoryStore()
    const stop = registerCompositionHistory(editor, id, history)
    type(editor, 'a')
    editor.update(() => $getRoot().selectEnd().insertText('external'), {
      discrete: true,
      tag: HISTORY_MERGE_TAG,
    })
    expect(await history.undo()).toBe(false)
    expect(textOf(editor)).toBe('aexternal')
    expect(history.getSnapshot().canUndo).toBe(true)
    stop()
  })
})
