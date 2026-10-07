import { Alignment, BlockType, type ChosenBlockType, type Formatting, TextFormat } from './types'

// The controls' order in the toolbar and the menus
export const TEXT_FORMATS = Object.values(TextFormat)
export const BLOCK_TYPES: ChosenBlockType[] = [
  BlockType.Paragraph,
  BlockType.H1,
  BlockType.H2,
  BlockType.H3,
  BlockType.Quote,
]
export const ALIGNMENTS = Object.values(Alignment)

export const NO_FORMATTING: Formatting = {
  text: false,
  font: 'default',
  formats: {
    [TextFormat.Bold]: false,
    [TextFormat.Italic]: false,
    [TextFormat.Underline]: false,
    [TextFormat.Strikethrough]: false,
  },
  blockType: BlockType.Paragraph,
  align: Alignment.Left,
}

// A page break node's type in saved documents
export const PAGE_BREAK_TYPE = 'page-break'

// The DOM marker the page layout looks for, to stretch a page break to its page's end
export const PAGE_BREAK_ATTRIBUTE = 'data-page-break'
