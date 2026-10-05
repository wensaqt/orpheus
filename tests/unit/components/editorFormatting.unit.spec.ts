import { $createListItemNode, $createListNode, ListItemNode, ListNode } from '@lexical/list'
import {
  $createHeadingNode,
  $createQuoteNode,
  HeadingNode,
  QuoteNode,
  registerRichText,
} from '@lexical/rich-text'
import {
  $createNodeSelection,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isElementNode,
  $setSelection,
  createEditor,
  FORMAT_TEXT_COMMAND,
  type LexicalEditor,
  type TextNode,
} from 'lexical'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  $readFormatting,
  $setBlockType,
  type Formatting,
  NO_FORMATTING,
  sameFormatting,
  toAlignment,
  toElementFormat,
} from '@front/_components/editor/formatting'
import { $createPageBreakNode, PageBreakNode } from '@front/_components/editor/nodes/PageBreakNode'

describe('alignment', () => {
  it('reads no alignment and the start as left, the end as right', () => {
    expect(toAlignment('')).toBe('left')
    expect(toAlignment('left')).toBe('left')
    expect(toAlignment('start')).toBe('left')
    expect(toAlignment('end')).toBe('right')
    expect(toAlignment('center')).toBe('center')
    expect(toAlignment('justify')).toBe('justify')
  })

  it('sets left as no alignment at all, the others as they are', () => {
    expect(toElementFormat('left')).toBe('')
    expect(toElementFormat('right')).toBe('right')
    expect(toElementFormat('justify')).toBe('justify')
  })
})

describe('sameFormatting', () => {
  const bold: Formatting = { ...NO_FORMATTING, text: true, formats: { ...NO_FORMATTING.formats } }
  it('compares every field, formats one by one', () => {
    expect(sameFormatting(bold, { ...bold, formats: { ...bold.formats } })).toBe(true)
    expect(sameFormatting(bold, NO_FORMATTING)).toBe(false)
    expect(sameFormatting(bold, { ...bold, formats: { ...bold.formats, italic: true } })).toBe(
      false,
    )
    expect(sameFormatting(bold, { ...bold, align: 'center' })).toBe(false)
    expect(sameFormatting(bold, { ...bold, blockType: 'h1' })).toBe(false)
  })
})

describe('the selection’s formatting', () => {
  let editor: LexicalEditor
  let plain: TextNode
  let strong: TextNode

  // A paragraph "Orpheus " + bold "sings", in a rich text editor without a DOM
  beforeEach(() => {
    editor = createEditor({
      nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, PageBreakNode],
      onError: (error) => {
        throw error
      },
    })
    registerRichText(editor)
    update(() => {
      plain = $createTextNode('Orpheus ')
      strong = $createTextNode('sings').toggleFormat('bold')
      $getRoot().append($createParagraphNode().append(plain, strong))
    })
  })

  const update = (change: () => void) => editor.update(change, { discrete: true })
  const read = () => editor.getEditorState().read($readFormatting)

  it('is nothing without a selection', () => {
    expect(read()).toEqual(NO_FORMATTING)
  })

  it('shows a format toggled on a range, and off again', () => {
    update(() => plain.select(0, 7))
    update(() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic'))
    expect(read()).toMatchObject({ text: true, blockType: 'paragraph', align: 'left' })
    expect(read().formats).toEqual({
      bold: false,
      italic: true,
      underline: false,
      strikethrough: false,
    })
    update(() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic'))
    expect(read().formats.italic).toBe(false)
  })

  it('shows a format armed at a caret, before any text is typed', () => {
    update(() => plain.select(3, 3))
    update(() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline'))
    expect(read().formats.underline).toBe(true)
    // Nothing changed in the text itself
    expect(editor.getEditorState().read(() => plain.getLatest().hasFormat('underline'))).toBe(false)
  })

  it('reads the block type: headings, quotes, lists', () => {
    update(() => {
      const heading = $createHeadingNode('h2').append($createTextNode('Chant'))
      const quote = $createQuoteNode().append($createTextNode('Dit-il'))
      const list = $createListNode('number').append(
        $createListItemNode().append($createTextNode('Un')),
      )
      const deep = $createHeadingNode('h5').append($createTextNode('Note'))
      $getRoot().append(heading, quote, list, deep)
    })
    const typeOfBlock = (index: number) => {
      update(() => {
        const block = $getRoot().getChildAtIndex(index)
        if ($isElementNode(block)) block.selectStart()
      })
      return read().blockType
    }
    expect(typeOfBlock(0)).toBe('paragraph')
    expect(typeOfBlock(1)).toBe('h2')
    expect(typeOfBlock(2)).toBe('quote')
    expect(typeOfBlock(3)).toBe('number')
    expect(typeOfBlock(4)).toBe('other')
  })

  it('reads the block’s alignment', () => {
    update(() => {
      plain.getParentOrThrow().setFormat('justify')
      plain.select(1, 1)
    })
    expect(read().align).toBe('justify')
  })

  it('is no text selection on a selected page break', () => {
    update(() => {
      const pageBreak = $createPageBreakNode()
      $getRoot().append(pageBreak)
      const selection = $createNodeSelection()
      selection.add(pageBreak.getKey())
      $setSelection(selection)
    })
    expect(read()).toEqual(NO_FORMATTING)
  })

  it('changes the block type, keeping the text and the alignment', () => {
    update(() => {
      plain.getParentOrThrow().setFormat('center')
      plain.select(1, 1)
      $setBlockType('h1')
    })
    expect(read()).toMatchObject({ blockType: 'h1', align: 'center' })
    expect(editor.getEditorState().read(() => $getRoot().getTextContent())).toBe('Orpheus sings')
    update(() => $setBlockType('paragraph'))
    expect(read()).toMatchObject({ blockType: 'paragraph', align: 'center' })
  })
})
