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
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isRootOrShadowRoot,
  type ElementFormatType,
  type LexicalNode,
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
  // A text selection (not a page break, not nothing): the styles apply to it
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
function $topLevelBlock(node: LexicalNode) {
  return node.getKey() === 'root'
    ? node
    : ($findMatchingParent(node, (candidate) => {
        const parent = candidate.getParent()
        return parent !== null && $isRootOrShadowRoot(parent)
      }) ?? node.getTopLevelElementOrThrow())
}

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

/*
 * The formatting of the selection. Text formats come from the selection itself: over a range,
 * the formats every selected text shares; at a caret, those the next typed text takes (which
 * a toggle changes before any text is typed). Call inside a read or an update.
 */
export function $readFormatting(): Formatting {
  const selection = $getSelection()
  if (!$isRangeSelection(selection)) return NO_FORMATTING
  const anchor = selection.anchor.getNode()
  const block = $findMatchingParent(anchor, (node) => $isElementNode(node) && !node.isInline())
  return {
    text: true,
    formats: {
      bold: selection.hasFormat('bold'),
      italic: selection.hasFormat('italic'),
      underline: selection.hasFormat('underline'),
      strikethrough: selection.hasFormat('strikethrough'),
    },
    blockType: $blockTypeOf(anchor),
    align:
      $isElementNode(block) && !$isRootOrShadowRoot(block)
        ? toAlignment(block.getFormatType())
        : 'left',
  }
}

/*
 * Turns the selected blocks into this type, keeping their text, alignment and indent. Page
 * breaks stay as they are; a list item made a paragraph leaves its list.
 */
export function $setBlockType(next: ChosenBlockType) {
  const selection = $getSelection()
  if (!$isRangeSelection(selection)) return
  const { anchor, focus } = selection
  if ([anchor, focus].every((point) => $blockTypeOf(point.getNode()) === next)) return
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
