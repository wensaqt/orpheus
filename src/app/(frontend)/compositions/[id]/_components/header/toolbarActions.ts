'use client'

import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
} from '@lexical/list'
import {
  $addUpdateTag,
  $selectAll,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  type LexicalEditor,
  type RangeSelection,
  SKIP_SELECTION_FOCUS_TAG,
} from 'lexical'

import {
  $blockTypeOf,
  $insertPageBreak,
  $setBlockType,
  $setSelectionFont,
  $textSelection,
  toElementFormat,
} from '@front/_components/editor/formatting'
import type { FontChoice } from '@front/_components/editor/fonts'
import {
  type Alignment,
  BlockType,
  type ChosenBlockType,
  type ListType,
  type TextFormat,
} from '@front/_components/editor/types'

import { useEditorHistory } from '../history/HistoryProvider'
import { useOpenEditor } from '../editorFocus'

/*
 * What the editor's menu bar and style toolbar do, shared by both, on the open document. The
 * styles apply to a text selection only (never to a selected page break).
 */

/*
 * A control pressed with the keyboard (a click without a pointer: `detail` is 0) keeps the
 * focus, to press the next one; with a pointer, the writer is back in the text
 */
export const pressedWithKeyboard = (event: { detail: number }) => event.detail === 0

/*
 * Runs a change on the text selection. With a control to keep the focus on, the text does not
 * take it; but its selection is still drawn where the change left it (some engines then focus
 * the text all the same), and the control takes the focus back once done
 */
function onText(
  editor: LexicalEditor,
  keepFocusOn: HTMLElement | undefined,
  $change: (selection: RangeSelection) => void,
) {
  editor.update(
    () => {
      const selection = $textSelection()
      if (!selection) return
      if (keepFocusOn) $addUpdateTag(SKIP_SELECTION_FOCUS_TAG)
      $change(selection)
    },
    { onUpdate: () => keepFocusOn?.focus() },
  )
}

function waitForComposition(editor: LexicalEditor | null): Promise<boolean> {
  if (!editor?.isComposing()) return Promise.resolve(true)
  const root = editor.getRootElement()
  if (!root) return Promise.resolve(false)
  return new Promise((resolve) => {
    let unregister = () => {}
    const finish = (ready: boolean) => {
      root.removeEventListener('compositionend', end)
      unregister()
      resolve(ready)
    }
    const end = () => finish(true)
    root.addEventListener('compositionend', end, { once: true })
    unregister = editor.registerRootListener((next) => {
      if (next !== root) finish(false)
    })
  })
}

// Wait for fonts, then give the pagination's frame scheduler time to measure the text.
async function printDocument(editor: LexicalEditor | null) {
  if (!(await waitForComposition(editor))) return
  await document.fonts.ready
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  )
  window.print()
}

export type ToolbarActions = ReturnType<typeof useToolbarActions>

// The actions, on the open document's editor (none when no document is open)
export function useToolbarActions() {
  const editor = useOpenEditor()
  const history = useEditorHistory()
  const run = (action: (editor: LexicalEditor) => void) => {
    if (editor && !history.getSnapshot().busy) action(editor)
  }
  return {
    undo: (keepFocusOn?: HTMLElement) => {
      void history.undo().then(() => keepFocusOn?.focus())
    },
    redo: (keepFocusOn?: HTMLElement) => {
      void history.redo().then(() => keepFocusOn?.focus())
    },
    selectAll: () => run((editor) => editor.update(() => void $selectAll())),
    print: () => void printDocument(editor),
    pageBreak: () => run((editor) => onText(editor, undefined, $insertPageBreak)),
    formatText: (format: TextFormat, keepFocusOn?: HTMLElement) =>
      run((editor) =>
        onText(editor, keepFocusOn, () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, format)),
      ),
    font: (font: FontChoice, keepFocusOn?: HTMLElement) =>
      run((editor) =>
        onText(editor, keepFocusOn, (selection) => $setSelectionFont(selection, font)),
      ),
    align: (align: Alignment, keepFocusOn?: HTMLElement) =>
      run((editor) =>
        onText(editor, keepFocusOn, () =>
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, toElementFormat(align)),
        ),
      ),
    blockType: (type: ChosenBlockType) =>
      run((editor) => onText(editor, undefined, () => $setBlockType(type))),
    // A list of this type, or back to paragraphs when the blocks already are one
    list: (type: ListType, keepFocusOn?: HTMLElement) =>
      run((editor) =>
        onText(editor, keepFocusOn, (selection) =>
          $blockTypeOf(selection.anchor.getNode()) === type
            ? editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
            : editor.dispatchCommand(
                type === BlockType.Bullet
                  ? INSERT_UNORDERED_LIST_COMMAND
                  : INSERT_ORDERED_LIST_COMMAND,
                undefined,
              ),
        ),
      ),
  }
}
