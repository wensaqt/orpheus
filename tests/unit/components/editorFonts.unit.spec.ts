import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isRangeSelection,
  $getSelection,
  createEditor,
  getStyleObjectFromCSS,
  type LexicalEditor,
  type TextNode,
} from 'lexical'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  $readFormatting,
  $setSelectionFont,
  sameFormatting,
} from '@front/_components/editor/formatting'
import { FontId } from '@front/_components/editor/fonts'
import { NO_FORMATTING } from '@front/_components/editor/constants'

describe('document fonts', () => {
  let editor: LexicalEditor
  let plain: TextNode
  let bold: TextNode
  const update = (change: () => void) => editor.update(change, { discrete: true })
  const read = () => editor.getEditorState().read($readFormatting)
  const texts = (source = editor) =>
    source.getEditorState().read(() =>
      $getRoot()
        .getAllTextNodes()
        .map((node) => ({
          text: node.getTextContent(),
          font: getStyleObjectFromCSS(node.getStyle())['font-family'],
          bold: node.hasFormat('bold'),
          italic: node.hasFormat('italic'),
        })),
    )
  const changeFont = (font: FontId | 'default') =>
    update(() => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection)) throw new Error('Expected a text selection')
      $setSelectionFont(selection, font)
    })

  beforeEach(() => {
    editor = createEditor({
      onError: (error) => {
        throw error
      },
    })
    update(() => {
      plain = $createTextNode('Orpheus ')
      bold = $createTextNode('sings').toggleFormat('bold')
      $getRoot().append($createParagraphNode().append(plain, bold))
    })
  })

  it('changes only the selected characters across nodes, keeping bold intact', () => {
    update(() => {
      const selection = plain.select(2, 2)
      selection.focus.set(bold.getKey(), 2, 'text')
    })
    changeFont(FontId.Lora)
    expect(texts()).toEqual([
      { text: 'Or', font: undefined, bold: false, italic: false },
      { text: 'pheus ', font: 'var(--font-document-lora)', bold: false, italic: false },
      { text: 'si', font: 'var(--font-document-lora)', bold: true, italic: false },
      { text: 'ngs', font: undefined, bold: true, italic: false },
    ])
    expect(read().font).toBe(FontId.Lora)
  })

  it('distinguishes mixed fonts and ignores nodes only touched at the selection boundary', () => {
    update(() => {
      plain.setStyle('font-family:var(--font-document-lora);')
      const selection = plain.select(0, 0)
      selection.focus.set(bold.getKey(), 5, 'text')
    })
    expect(read().font).toBe('mixed')
    update(() => {
      const selection = plain.select(8, 8)
      selection.focus.set(bold.getKey(), 2, 'text')
    })
    expect(read().font).toBe('default')
    update(() => {
      const selection = bold.select(5, 5)
      selection.focus.set(plain.getKey(), 2, 'text')
    })
    expect(read().font).toBe('mixed')
  })

  it('prepares the next typed text at a caret, and clearing the font restores inheritance', () => {
    update(() => plain.select(3, 3))
    const before = editor.getEditorState().toJSON()
    changeFont(FontId.Lora)
    expect(read().font).toBe(FontId.Lora)
    expect(editor.getEditorState().toJSON()).toEqual(before)
    update(() => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection)) throw new Error('Expected a caret')
      selection.insertText('x')
    })
    expect(texts().find(({ text }) => text === 'x')?.font).toBe('var(--font-document-lora)')
    changeFont('default')
    expect(read().font).toBe('default')
    update(() => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection)) throw new Error('Expected a caret')
      selection.insertText('y')
    })
    const inherited = texts().find(({ text }) => text.includes('y'))
    expect(inherited).toBeDefined()
    expect(inherited?.font).toBeUndefined()
  })

  it('round-trips font styles through saved JSON, and removes only the font on reset', () => {
    update(() => bold.select(0, 5))
    changeFont(FontId.SourceSerif)
    const restored = createEditor({
      onError: (error) => {
        throw error
      },
    })
    restored.setEditorState(restored.parseEditorState(editor.getEditorState().toJSON()))
    expect(texts(restored)).toEqual(texts())
    changeFont('default')
    expect(texts()).toEqual([
      { text: 'Orpheus ', font: undefined, bold: false, italic: false },
      { text: 'sings', font: undefined, bold: true, italic: false },
    ])
  })

  it('keeps imported fonts distinct and refreshes the toolbar when only the font changes', () => {
    update(() => {
      plain.setStyle('font-family:Georgia;')
      plain.select(0, 8)
    })
    expect(read().font).toBe('unknown')
    expect(sameFormatting(NO_FORMATTING, { ...NO_FORMATTING, font: FontId.Lora })).toBe(false)
  })
})
