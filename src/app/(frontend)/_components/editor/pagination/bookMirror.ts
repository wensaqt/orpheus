import { PAGES_ATTRIBUTE } from './constants'

// The inactive spread shows the same DOM flow as the editor. Keep a node map so a
// keystroke updates the corresponding text node instead of copying the whole book.
export class BookMirror {
  readonly element: HTMLElement
  private readonly nodes = new WeakMap<Node, Node>()

  constructor(source: HTMLElement) {
    this.element = source.cloneNode(true) as HTMLElement
    this.mapNodes(source, this.element)
    this.element.removeAttribute(PAGES_ATTRIBUTE)
    this.element.querySelector('style')?.remove()
    const editor = this.element.querySelector<HTMLElement>('[contenteditable="true"]')
    if (editor) {
      editor.contentEditable = 'false'
      editor.dataset.bookCopyEditor = ''
    }
    this.disableFocusable(this.element)
  }

  private mapNodes(source: Node, copy: Node) {
    this.nodes.set(source, copy)
    for (let index = 0; index < source.childNodes.length; index++) {
      this.mapNodes(source.childNodes[index], copy.childNodes[index])
    }
  }

  private disableFocusable(root: HTMLElement) {
    for (const element of root.querySelectorAll<HTMLElement>(
      '[id], a, button, input, [tabindex]',
    )) {
      element.removeAttribute('id')
      element.tabIndex = -1
    }
  }

  apply(records: MutationRecord[]) {
    for (const record of records) {
      const copy = this.nodes.get(record.target)
      if (!copy) continue
      if (record.type === 'characterData') {
        copy.nodeValue = record.target.nodeValue
      } else if (
        record.type === 'attributes' &&
        copy instanceof Element &&
        record.target instanceof Element
      ) {
        const name = record.attributeName
        if (
          !name ||
          name === PAGES_ATTRIBUTE ||
          name === 'id' ||
          name === 'tabindex' ||
          name === 'contenteditable'
        )
          continue
        const value = record.target.getAttribute(name)
        if (value === null) copy.removeAttribute(name)
        else copy.setAttribute(name, value)
      } else if (record.type === 'childList') {
        for (const removed of record.removedNodes) {
          const child = this.nodes.get(removed)
          child?.parentNode?.removeChild(child)
        }
        const next = record.nextSibling ? this.nodes.get(record.nextSibling) : null
        const before = next?.parentNode === copy ? next : null
        for (const added of record.addedNodes) {
          if (added instanceof HTMLStyleElement) continue
          const child = added.cloneNode(true)
          this.mapNodes(added, child)
          if (child instanceof HTMLElement) {
            const editor = child.matches('[contenteditable="true"]')
              ? child
              : child.querySelector<HTMLElement>('[contenteditable="true"]')
            if (editor) {
              editor.contentEditable = 'false'
              editor.dataset.bookCopyEditor = ''
            }
            this.disableFocusable(child)
          }
          copy.insertBefore(child, before)
        }
      }
    }
  }
}
