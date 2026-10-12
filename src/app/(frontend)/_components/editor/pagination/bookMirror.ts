import { PAGES_ATTRIBUTE } from './constants'

const MIRROR_ONLY_ATTRIBUTES = new Set([PAGES_ATTRIBUTE, 'id', 'tabindex', 'contenteditable'])

//TODO: JSdoc for all functions here

// The inactive spread shows the same DOM flow as the editor. Keep a node map so a
// keystroke updates the corresponding text node instead of copying the whole book.
export class BookMirror {
  readonly element: HTMLElement
  private readonly nodes = new WeakMap<Node, Node>()

  constructor(source: HTMLElement) {
    // TODO: remove type assertion if possible
    this.element = source.cloneNode(true) as HTMLElement
    this.mapNodes(source, this.element)
    this.element.removeAttribute(PAGES_ATTRIBUTE)
    this.element.querySelector('style')?.remove()
    this.prepareElement(this.element)
  }

  private prepareElement(root: HTMLElement) {
    const editor = root.matches('[contenteditable="true"]')
      ? root
      : root.querySelector<HTMLElement>('[contenteditable="true"]')
    if (editor) {
      editor.contentEditable = 'false'
      editor.dataset.bookCopyEditor = ''
    }
    this.disableFocusable(root)
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

  private copyAttribute(record: MutationRecord, copy: Node) {
    const name = record.attributeName
    // TODO: extract condition in dedicated function with explicit documentation
    if (
      !(copy instanceof Element) ||
      !(record.target instanceof Element) ||
      !name ||
      MIRROR_ONLY_ATTRIBUTES.has(name)
    )
      return
    const value = record.target.getAttribute(name)
    if (value === null) copy.removeAttribute(name)
    else copy.setAttribute(name, value)
  }

  private removeNodes(nodes: NodeList) {
    for (const node of nodes) {
      const copy = this.nodes.get(node)
      copy?.parentNode?.removeChild(copy)
    }
  }

  private cloneAddedNode(source: Node): Node {
    const copy = source.cloneNode(true)
    this.mapNodes(source, copy)
    if (copy instanceof HTMLElement) this.prepareElement(copy)
    return copy
  }

  private insertAddedNodes(record: MutationRecord, copy: Node) {
    const next = record.nextSibling ? this.nodes.get(record.nextSibling) : null
    const before = next?.parentNode === copy ? next : null
    for (const node of record.addedNodes) {
      if (!(node instanceof HTMLStyleElement)) copy.insertBefore(this.cloneAddedNode(node), before)
    }
  }

  private copyChildChanges(record: MutationRecord, copy: Node) {
    this.removeNodes(record.removedNodes)
    this.insertAddedNodes(record, copy)
  }

  private applyRecord(record: MutationRecord) {
    const copy = this.nodes.get(record.target)
    if (!copy) return
    if (record.type === 'characterData') copy.nodeValue = record.target.nodeValue
    else if (record.type === 'attributes') this.copyAttribute(record, copy)
    else if (record.type === 'childList') this.copyChildChanges(record, copy)
  }

  apply(records: MutationRecord[]) {
    for (const record of records) this.applyRecord(record)
  }
}
