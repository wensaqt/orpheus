import { addClassNamesToElement } from '@lexical/utils'
import {
  $applyNodeReplacement,
  DecoratorNode,
  type DOMExportOutput,
  type EditorConfig,
} from 'lexical'

// The node's type in saved documents
export const PAGE_BREAK_TYPE = 'page-break'

// The DOM marker the page layout looks for, to stretch the break to its page's end
export const PAGE_BREAK_ATTRIBUTE = 'data-page-break'

/*
 * A manual page break: what follows it starts on the next page. The page layout stretches it
 * down to the end of its page, on screen and in print alike (a DOM-only style, never written
 * to the editor state). A block of its own, selectable and deletable like any other; no React
 * part, its look is pure CSS.
 */
export class PageBreakNode extends DecoratorNode<null> {
  static getType(): string {
    return PAGE_BREAK_TYPE
  }

  static clone(node: PageBreakNode): PageBreakNode {
    return new PageBreakNode(node.__key)
  }

  static importJSON(): PageBreakNode {
    return $createPageBreakNode()
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = document.createElement('div')
    element.setAttribute(PAGE_BREAK_ATTRIBUTE, '')
    addClassNamesToElement(element, config.theme.pageBreak)
    return element
  }

  updateDOM(): false {
    return false
  }

  // Exported HTML has no page layout: CSS breaks the page there
  exportDOM(): DOMExportOutput {
    const element = document.createElement('div')
    element.style.breakAfter = 'page'
    return { element }
  }

  // A line of its own in plain text (copy, excerpts)
  getTextContent(): string {
    return '\n'
  }

  isInline(): false {
    return false
  }

  decorate(): null {
    return null
  }
}

export const $createPageBreakNode = (): PageBreakNode => $applyNodeReplacement(new PageBreakNode())
