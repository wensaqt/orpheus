import type { Alignment, BlockType, TextFormat } from '@front/_components/editor/formatting'
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
  bold: SHORTCUTS.bold,
  italic: SHORTCUTS.italic,
  underline: SHORTCUTS.underline,
}

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
