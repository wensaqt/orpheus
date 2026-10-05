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
  REDO_COMMAND,
  SKIP_SELECTION_FOCUS_TAG,
  UNDO_COMMAND,
} from 'lexical'

import {
  type Alignment,
  $blockTypeOf,
  type BlockType,
  type ChosenBlockType,
  $insertPageBreak,
  $setBlockType,
  $textSelection,
  type TextFormat,
  toElementFormat,
} from '@front/_components/editor/formatting'

import { useOpenEditor } from '../editorFocus'

/*
 * What the editor's menu bar and style toolbar do, shared by both, on the open document. The
 * styles apply to a text selection only (never to a selected page break).
 */

export type ListType = Extract<BlockType, 'bullet' | 'number'>

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

/*
 * Undo or redo. The history brings its selection back, which focuses the text once drawn (in
 * the updates it commits right away, more than one): a control to keep the focus on takes it
 * back after each
 */
function fromHistory(
  editor: LexicalEditor,
  command: typeof UNDO_COMMAND | typeof REDO_COMMAND,
  keepFocusOn: HTMLElement | undefined,
) {
  if (keepFocusOn) {
    const stop = editor.registerUpdateListener(() => keepFocusOn.focus())
    setTimeout(stop)
  }
  editor.dispatchCommand(command, undefined)
}

// The actions, on the open document's editor (none when no document is open)
export function useToolbarActions() {
  const editor = useOpenEditor()
  const run = (action: (editor: LexicalEditor) => void) => {
    if (editor) action(editor)
  }
  return {
    undo: (keepFocusOn?: HTMLElement) =>
      run((editor) => fromHistory(editor, UNDO_COMMAND, keepFocusOn)),
    redo: (keepFocusOn?: HTMLElement) =>
      run((editor) => fromHistory(editor, REDO_COMMAND, keepFocusOn)),
    selectAll: () => run((editor) => editor.update(() => void $selectAll())),
    print: () => window.print(),
    pageBreak: () => run((editor) => onText(editor, undefined, $insertPageBreak)),
    formatText: (format: TextFormat, keepFocusOn?: HTMLElement) =>
      run((editor) =>
        onText(editor, keepFocusOn, () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, format)),
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
                type === 'bullet' ? INSERT_UNORDERED_LIST_COMMAND : INSERT_ORDERED_LIST_COMMAND,
                undefined,
              ),
        ),
      ),
  }
}
