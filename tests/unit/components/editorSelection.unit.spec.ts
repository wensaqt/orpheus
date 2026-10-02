import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  createEditor,
  type LexicalEditor,
  type TextNode,
} from 'lexical'
import { beforeEach, describe, expect, it } from 'vitest'

import { $isAtDocumentStart } from '@front/_components/editor/selection'

describe('$isAtDocumentStart', () => {
  let editor: LexicalEditor
  let first: TextNode
  let second: TextNode

  // Two paragraphs, "Orpheus" then "Eurydice", in an editor without a DOM
  beforeEach(() => {
    editor = createEditor({
      onError: (error) => {
        throw error
      },
    })
    editor.update(
      () => {
        first = $createTextNode('Orpheus')
        second = $createTextNode('Eurydice')
        $getRoot().append(
          $createParagraphNode().append(first),
          $createParagraphNode().append(second),
        )
      },
      { discrete: true },
    )
  })

  const atStartAfter = (select: () => void) => {
    let atStart = false
    editor.update(
      () => {
        select()
        atStart = $isAtDocumentStart()
      },
      { discrete: true },
    )
    return atStart
  }

  it('is true for a caret before the first character', () => {
    expect(atStartAfter(() => first.select(0, 0))).toBe(true)
  })

  it('is false further into the text, in a later block, or with a selected range', () => {
    expect(atStartAfter(() => first.select(1, 1))).toBe(false)
    expect(atStartAfter(() => second.select(0, 0))).toBe(false)
    expect(atStartAfter(() => first.select(0, 3))).toBe(false)
  })

  it('is true in an empty first block', () => {
    expect(
      atStartAfter(() => {
        const empty = $createParagraphNode()
        $getRoot().getFirstChildOrThrow().insertBefore(empty)
        empty.select(0, 0)
      }),
    ).toBe(true)
  })
})
