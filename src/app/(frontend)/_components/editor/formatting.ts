import { $isListNode, ListNode } from '@lexical/list'
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  $isQuoteNode,
  type HeadingTagType,
} from '@lexical/rich-text'
import {
  $getSelectionStyleValueForProperty,
  $patchStyleText,
  $setBlocksType,
} from '@lexical/selection'
import { $getNearestNodeOfType, $insertNodeToNearestRoot } from '@lexical/utils'
import {
  $createParagraphNode,
  $addUpdateTag,
  $findMatchingParent,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isRootOrShadowRoot,
  $isTextNode,
  getStyleObjectFromCSS,
  HISTORY_PUSH_TAG,
  type ElementFormatType,
  type LexicalNode,
  type RangeSelection,
} from 'lexical'

import { NO_FORMATTING, TEXT_FORMATS } from './constants'
import {
  FONT_FAMILY_PROPERTY,
  fontFamilyOf,
  fontFromFamily,
  type FontChoice,
  type SelectedFont,
} from './fonts'
import { $createPageBreakNode } from './nodes/PageBreakNode'
import {
  Alignment,
  BlockType,
  type ChosenBlockType,
  type Formatting,
  type HeadingBlockType,
  TextFormat,
} from './types'

/*
 * A block's alignment as the toolbar shows it: no alignment (the default) and the writing
 * direction's start are left, its end is right (the editor writes left to right)
 */
const ALIGNMENT_OF_FORMAT: Partial<Record<ElementFormatType, Alignment>> = {
  center: Alignment.Center,
  right: Alignment.Right,
  end: Alignment.Right,
  justify: Alignment.Justify,
}

export const toAlignment = (format: ElementFormatType): Alignment =>
  ALIGNMENT_OF_FORMAT[format] ?? Alignment.Left

// The format a block is given for an alignment: left is no format at all, as a new block has
export const toElementFormat = (align: Alignment): ElementFormatType =>
  align === Alignment.Left ? '' : align

export const sameFormatting = (a: Formatting, b: Formatting) =>
  a.text === b.text &&
  a.font === b.font &&
  a.blockType === b.blockType &&
  a.align === b.align &&
  TEXT_FORMATS.every((format) => a.formats[format] === b.formats[format])

// The block right under the root (a list rather than its item)
const $topLevelBlock = (node: LexicalNode) =>
  $isRootOrShadowRoot(node) ? node : node.getTopLevelElementOrThrow()

// The headings the writer can choose; a deeper one reads as another type
const HEADING_BLOCK_TYPES: Partial<Record<HeadingTagType, HeadingBlockType>> = {
  h1: BlockType.H1,
  h2: BlockType.H2,
  h3: BlockType.H3,
}

// The type of the block a node is in; in a list, of the nearest list (a nested one may differ)
export function $blockTypeOf(node: LexicalNode): BlockType {
  const block = $topLevelBlock(node)
  if ($isListNode(block)) {
    const list = $getNearestNodeOfType(node, ListNode) ?? block
    return list.getListType() === 'number' ? BlockType.Number : BlockType.Bullet
  }
  if ($isHeadingNode(block)) return HEADING_BLOCK_TYPES[block.getTag()] ?? BlockType.Other
  if ($isQuoteNode(block)) return BlockType.Quote
  return block.getType() === 'paragraph' ? BlockType.Paragraph : BlockType.Other
}

// The text formats of a selection, or of a text node
const formatsOf = (source: { hasFormat: (format: TextFormat) => boolean }) => ({
  [TextFormat.Bold]: source.hasFormat(TextFormat.Bold),
  [TextFormat.Italic]: source.hasFormat(TextFormat.Italic),
  [TextFormat.Underline]: source.hasFormat(TextFormat.Underline),
  [TextFormat.Strikethrough]: source.hasFormat(TextFormat.Strikethrough),
})

function $formattingAt(
  node: LexicalNode,
  formats: Formatting['formats'],
  font: SelectedFont,
): Formatting {
  const block = $findMatchingParent(node, (parent) => $isElementNode(parent) && !parent.isInline())
  return {
    text: true,
    font,
    formats,
    blockType: $blockTypeOf(node),
    align:
      $isElementNode(block) && !$isRootOrShadowRoot(block)
        ? toAlignment(block.getFormatType())
        : Alignment.Left,
  }
}

// At a caret, selection.style describes the next typed text, including a cleared font.
export function $selectionFont(selection: RangeSelection): SelectedFont {
  if (selection.isCollapsed()) {
    return fontFromFamily(getStyleObjectFromCSS(selection.style)[FONT_FAMILY_PROPERTY])
  }
  const family = $getSelectionStyleValueForProperty(selection, FONT_FAMILY_PROPERTY, 'inherit')
  return family === '' ? 'mixed' : fontFromFamily(family)
}

export function $setSelectionFont(selection: RangeSelection, font: FontChoice) {
  if ($selectionFont(selection) === font) return
  $patchStyleText(selection, { [FONT_FAMILY_PROPERTY]: fontFamilyOf(font) })
  // A text change is its own undo step; at a caret this prepares the next typed text.
  $addUpdateTag(HISTORY_PUSH_TAG)
}

/*
 * The formatting of the selection. Text formats come from the selection itself: over a range,
 * the formats every selected text shares; at a caret, those the next typed text takes (which
 * a toggle changes before any text is typed). Without a selection yet, as at the start of the
 * text, where a change puts one. Call inside a read or an update.
 */
export function $readFormatting(): Formatting {
  const selection = $getSelection()
  // TODO: no nested conditions if possible
  if (selection === null) {
    const first = $getRoot().getFirstDescendant()
    let style = ''
    if ($isTextNode(first)) style = first.getStyle()
    else if ($isElementNode(first)) style = first.getTextStyle()
    return $formattingAt(
      first ?? $getRoot(),
      $isTextNode(first) ? formatsOf(first) : NO_FORMATTING.formats,
      fontFromFamily(getStyleObjectFromCSS(style)[FONT_FAMILY_PROPERTY]),
    )
  }
  if (!$isRangeSelection(selection)) return NO_FORMATTING
  return $formattingAt(selection.anchor.getNode(), formatsOf(selection), $selectionFont(selection))
}

/*
 * The selection a change of style applies to: the text's, or a caret at its start when there
 * is none yet (the text not focused since the document opened). Null for a selected page
 * break. Call inside an update.
 */
export function $textSelection(): RangeSelection | null {
  if ($getSelection() === null) $getRoot().selectStart()
  const selection = $getSelection()
  return $isRangeSelection(selection) ? selection : null
}

/*
 * Turns the selected blocks into this type, keeping their text, alignment and indent. Page
 * breaks stay as they are; a list item made a paragraph leaves its list.
 */
export function $setBlockType(next: ChosenBlockType) {
  const selection = $getSelection()
  if (!$isRangeSelection(selection)) return
  // Already all of this type: nothing to change (nor to undo)
  if (selection.getNodes().every((node) => $blockTypeOf(node) === next)) return
  $setBlocksType(selection, () => $createBlock(next))
}

function $createBlock(type: ChosenBlockType) {
  if (type === BlockType.Paragraph) return $createParagraphNode()
  if (type === BlockType.Quote) return $createQuoteNode()
  return $createHeadingNode(type)
}

// A page break where the selection is: what follows starts on the next page
export const $insertPageBreak = () => $insertNodeToNearestRoot($createPageBreakNode())
