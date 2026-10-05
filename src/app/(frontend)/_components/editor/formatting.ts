import { $isListNode, ListNode } from '@lexical/list'
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  $isQuoteNode,
} from '@lexical/rich-text'
import { $setBlocksType } from '@lexical/selection'
import { $getNearestNodeOfType, $insertNodeToNearestRoot } from '@lexical/utils'
import {
  $createParagraphNode,
  $findMatchingParent,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isRootOrShadowRoot,
  $isTextNode,
  type ElementFormatType,
  type LexicalNode,
  type RangeSelection,
} from 'lexical'

import { $createPageBreakNode } from './nodes/PageBreakNode'

// The text formats the toolbar toggles
export const TEXT_FORMATS = ['bold', 'italic', 'underline', 'strikethrough'] as const
export type TextFormat = (typeof TEXT_FORMATS)[number]

// The block types the writer can choose; the others are only read (lists, deeper headings)
export const BLOCK_TYPES = ['paragraph', 'h1', 'h2', 'h3', 'quote'] as const
export type ChosenBlockType = (typeof BLOCK_TYPES)[number]
export type BlockType = ChosenBlockType | 'bullet' | 'number' | 'other'

export const ALIGNMENTS = ['left', 'center', 'right', 'justify'] as const
export type Alignment = (typeof ALIGNMENTS)[number]

// What the selection holds, as the toolbar shows it
export type Formatting = {
  // A text selection, or none yet (see $textSelection), not a page break: the styles apply
  text: boolean
  formats: Record<TextFormat, boolean>
  blockType: BlockType
  align: Alignment
}

export const NO_FORMATTING: Formatting = {
  text: false,
  formats: { bold: false, italic: false, underline: false, strikethrough: false },
  blockType: 'paragraph',
  align: 'left',
}

/*
 * A block's alignment as the toolbar shows it: no alignment (the default) and the writing
 * direction's start are left, its end is right (the editor writes left to right)
 */
export function toAlignment(format: ElementFormatType): Alignment {
  if (format === 'center' || format === 'right' || format === 'justify') return format
  return format === 'end' ? 'right' : 'left'
}

// The format a block is given for an alignment: left is no format at all, as a new block has
export const toElementFormat = (align: Alignment): ElementFormatType =>
  align === 'left' ? '' : align

export const sameFormatting = (a: Formatting, b: Formatting) =>
  a.text === b.text &&
  a.blockType === b.blockType &&
  a.align === b.align &&
  TEXT_FORMATS.every((format) => a.formats[format] === b.formats[format])

// The block right under the root (a list rather than its item)
const $topLevelBlock = (node: LexicalNode) =>
  $isRootOrShadowRoot(node) ? node : node.getTopLevelElementOrThrow()

// The type of the block a node is in; in a list, of the nearest list (a nested one may differ)
export function $blockTypeOf(node: LexicalNode): BlockType {
  const block = $topLevelBlock(node)
  if ($isListNode(block)) {
    const list = $getNearestNodeOfType(node, ListNode) ?? block
    return list.getListType() === 'number' ? 'number' : 'bullet'
  }
  if ($isHeadingNode(block)) {
    const tag = block.getTag()
    return tag === 'h1' || tag === 'h2' || tag === 'h3' ? tag : 'other'
  }
  if ($isQuoteNode(block)) return 'quote'
  return block.getType() === 'paragraph' ? 'paragraph' : 'other'
}

// The text formats of a selection, or of a text node
const formatsOf = (source: { hasFormat: (format: TextFormat) => boolean }) => ({
  bold: source.hasFormat('bold'),
  italic: source.hasFormat('italic'),
  underline: source.hasFormat('underline'),
  strikethrough: source.hasFormat('strikethrough'),
})

function $formattingAt(node: LexicalNode, formats: Formatting['formats']): Formatting {
  const block = $findMatchingParent(node, (parent) => $isElementNode(parent) && !parent.isInline())
  return {
    text: true,
    formats,
    blockType: $blockTypeOf(node),
    align:
      $isElementNode(block) && !$isRootOrShadowRoot(block)
        ? toAlignment(block.getFormatType())
        : 'left',
  }
}

/*
 * The formatting of the selection. Text formats come from the selection itself: over a range,
 * the formats every selected text shares; at a caret, those the next typed text takes (which
 * a toggle changes before any text is typed). Without a selection yet, as at the start of the
 * text, where a change puts one. Call inside a read or an update.
 */
export function $readFormatting(): Formatting {
  const selection = $getSelection()
  if (selection === null) {
    const first = $getRoot().getFirstDescendant()
    return $formattingAt(
      first ?? $getRoot(),
      $isTextNode(first) ? formatsOf(first) : NO_FORMATTING.formats,
    )
  }
  if (!$isRangeSelection(selection)) return NO_FORMATTING
  return $formattingAt(selection.anchor.getNode(), formatsOf(selection))
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
  $setBlocksType(selection, () =>
    next === 'paragraph'
      ? $createParagraphNode()
      : next === 'quote'
        ? $createQuoteNode()
        : $createHeadingNode(next),
  )
}

// A page break where the selection is: what follows starts on the next page
export const $insertPageBreak = () => $insertNodeToNearestRoot($createPageBreakNode())
