import type { SelectedFont } from './fonts'

// The text formats the toolbar togggles, named as Lexical names them
export enum TextFormat {
  Bold = 'bold',
  Italic = 'italic',
  Underline = 'underline',
  Strikethrough = 'strikethrough',
}

/*
 * A block's type, as the toolbar shows it. The writer chooses among the paragraph, the three
 * headings and the quote; lists have their own controls; any other block (a deeper heading)
 * is only read.
 */
export enum BlockType {
  Paragraph = 'paragraph',
  H1 = 'h1',
  H2 = 'h2',
  H3 = 'h3',
  Quote = 'quote',
  Bullet = 'bullet',
  Number = 'number',
  Other = 'other',
}

export type HeadingBlockType = BlockType.H1 | BlockType.H2 | BlockType.H3
export type ChosenBlockType = BlockType.Paragraph | HeadingBlockType | BlockType.Quote
export type ListType = BlockType.Bullet | BlockType.Number

export enum Alignment {
  Left = 'left',
  Center = 'center',
  Right = 'right',
  Justify = 'justify',
}

// What the selection holds, as the toolbar shows it
export type Formatting = {
  // A text selection, or none yet (see $textSelection), not a page break: the styles apply
  text: boolean
  font: SelectedFont
  formats: Record<TextFormat, boolean>
  blockType: BlockType
  align: Alignment
}

// Whether an editor has something to undo and to redo
export type HistoryAvailability = { canUndo: boolean; canRedo: boolean }
