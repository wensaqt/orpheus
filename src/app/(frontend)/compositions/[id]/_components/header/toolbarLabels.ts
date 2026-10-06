import { Alignment, BlockType, TextFormat } from '@front/_components/editor/types'
import type { Shortcut } from '@front/_components/ui/shortcuts'
import type { MessageKey } from '@front/_lib/i18n'

// What the menu bar's items and the style toolbar's controls are called, and their keys

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

// Lexical has none for strikethrough
export const TEXT_FORMAT_SHORTCUTS: Partial<Record<TextFormat, Shortcut>> = {
  [TextFormat.Bold]: SHORTCUTS.bold,
  [TextFormat.Italic]: SHORTCUTS.italic,
  [TextFormat.Underline]: SHORTCUTS.underline,
}

export const TEXT_FORMAT_LABELS = {
  [TextFormat.Bold]: 'editor.actions.bold',
  [TextFormat.Italic]: 'editor.actions.italic',
  [TextFormat.Underline]: 'editor.actions.underline',
  [TextFormat.Strikethrough]: 'editor.actions.strikethrough',
} as const satisfies Record<TextFormat, MessageKey>

export const ALIGNMENT_LABELS = {
  [Alignment.Left]: 'editor.actions.alignLeft',
  [Alignment.Center]: 'editor.actions.alignCenter',
  [Alignment.Right]: 'editor.actions.alignRight',
  [Alignment.Justify]: 'editor.actions.justify',
} as const satisfies Record<Alignment, MessageKey>

export const BLOCK_TYPE_LABELS = {
  [BlockType.Paragraph]: 'editor.blockTypes.paragraph',
  [BlockType.H1]: 'editor.blockTypes.h1',
  [BlockType.H2]: 'editor.blockTypes.h2',
  [BlockType.H3]: 'editor.blockTypes.h3',
  [BlockType.Quote]: 'editor.blockTypes.quote',
  [BlockType.Bullet]: 'editor.actions.bulletList',
  [BlockType.Number]: 'editor.actions.numberedList',
  [BlockType.Other]: 'editor.blockTypes.other',
} as const satisfies Record<BlockType, MessageKey>
