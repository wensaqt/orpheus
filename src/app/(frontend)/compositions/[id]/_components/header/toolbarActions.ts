import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
} from '@lexical/list'
import {
  $addUpdateTag,
  $getSelection,
  $isRangeSelection,
  $selectAll,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  type LexicalEditor,
  REDO_COMMAND,
  SKIP_SELECTION_FOCUS_TAG,
  UNDO_COMMAND,
} from 'lexical'

import {
  type Alignment,
  type BlockType,
  type ChosenBlockType,
  $insertPageBreak,
  $setBlockType,
  type TextFormat,
  toElementFormat,
} from '@front/_components/editor/formatting'
import type { Shortcut } from '@front/_components/ui/shortcuts'
import type { MessageKey } from '@front/_lib/i18n'

/*
 * What the editor's menu bar and style toolbar do, shared by both: each action takes the open
 * document's editor. The styles apply to a text selection only (never to a selected page break).
 */

// The shortcuts the editor already has (Lexical's own, Cmd/Ctrl+Enter, the browser's print)
export const SHORTCUTS = {
  undo: 'Mod+Z',
  redo: 'Mod+Shift+Z',
  selectAll: 'Mod+A',
  bold: 'Mod+B',
  italic: 'Mod+I',
  underline: 'Mod+U',
  pageBreak: 'Mod+Enter',
  print: 'Mod+P',
} as const satisfies Record<string, Shortcut>

export const TEXT_FORMAT_LABELS = {
  bold: 'editor.actions.bold',
  italic: 'editor.actions.italic',
  underline: 'editor.actions.underline',
  strikethrough: 'editor.actions.strikethrough',
} as const satisfies Record<TextFormat, MessageKey>

export const ALIGNMENT_LABELS = {
  left: 'editor.actions.alignLeft',
  center: 'editor.actions.alignCenter',
  right: 'editor.actions.alignRight',
  justify: 'editor.actions.justify',
} as const satisfies Record<Alignment, MessageKey>

export const BLOCK_TYPE_LABELS = {
  paragraph: 'editor.blockTypes.paragraph',
  h1: 'editor.blockTypes.h1',
  h2: 'editor.blockTypes.h2',
  h3: 'editor.blockTypes.h3',
  quote: 'editor.blockTypes.quote',
  bullet: 'editor.actions.bulletList',
  number: 'editor.actions.numberedList',
  other: 'editor.blockTypes.other',
} as const satisfies Record<BlockType, MessageKey>

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
function onText(editor: LexicalEditor, keepFocusOn: HTMLElement | undefined, $change: () => void) {
  editor.update(
    () => {
      if (!$isRangeSelection($getSelection())) return
      if (keepFocusOn) $addUpdateTag(SKIP_SELECTION_FOCUS_TAG)
      $change()
    },
    { onUpdate: () => keepFocusOn?.focus() },
  )
}

export const toolbarActions = {
  undo: (editor: LexicalEditor) => editor.dispatchCommand(UNDO_COMMAND, undefined),
  redo: (editor: LexicalEditor) => editor.dispatchCommand(REDO_COMMAND, undefined),
  selectAll: (editor: LexicalEditor) => editor.update(() => void $selectAll()),
  print: () => window.print(),
  pageBreak: (editor: LexicalEditor) => onText(editor, undefined, $insertPageBreak),
  formatText: (editor: LexicalEditor, format: TextFormat, keepFocusOn?: HTMLElement) =>
    onText(editor, keepFocusOn, () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, format)),
  align: (editor: LexicalEditor, align: Alignment, keepFocusOn?: HTMLElement) =>
    onText(editor, keepFocusOn, () =>
      editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, toElementFormat(align)),
    ),
  blockType: (editor: LexicalEditor, type: ChosenBlockType) =>
    onText(editor, undefined, () => $setBlockType(type)),
  // A list of this type, or back to paragraphs when the blocks already are one
  list: (editor: LexicalEditor, type: ListType, current: BlockType, keepFocusOn?: HTMLElement) =>
    onText(editor, keepFocusOn, () => {
      if (current === type) editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
      else
        editor.dispatchCommand(
          type === 'bullet' ? INSERT_UNORDERED_LIST_COMMAND : INSERT_ORDERED_LIST_COMMAND,
          undefined,
        )
    }),
}
