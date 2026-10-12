import { PAGES_ATTRIBUTE } from './constants'

const MIRROR_ONLY_ATTRIBUTES = new Set([PAGES_ATTRIBUTE, 'id', 'tabindex', 'contenteditable'])

/** Preserve the HTML root type without asserting the DOM clone's return type. */
function cloneHtmlElement(source: HTMLElement): HTMLElement {
  const copy = source.cloneNode(true)
  if (!(copy instanceof HTMLElement)) throw new Error('Expected an HTML book mirror root')
  return copy
}

/** Mirror visual attributes only; identity and editability belong to the live editor. */
function mirroredAttribute(record: MutationRecord, copy: Node) {
  const name = record.attributeName
  if (!(copy instanceof Element) || !(record.target instanceof Element)) return null
  if (!name || MIRROR_ONLY_ATTRIBUTES.has(name)) return null
  return { source: record.target, element: copy, name }
}

// The inactive spread shows the same DOM flow as the editor. Keep a node map so a
// keystroke updates the corresponding text node instead of copying the whole book.
export class BookMirror {
  readonly element: HTMLElement
  private readonly nodes = new WeakMap<Node, Node>()

  /** Create an inert copy and map its nodes to the live editor. */
  constructor(source: HTMLElement) {
    this.element = cloneHtmlElement(source)
    this.mapNodes(source, this.element)
    this.element.removeAttribute(PAGES_ATTRIBUTE)
    this.element.querySelector('style')?.remove()
    this.prepareElement(this.element)
  }

  /** Keep copied editor content visible but non-interactive. */
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

  /** Pair the nodes of two identical DOM trees recursively. */
  private mapNodes(source: Node, copy: Node) {
    this.nodes.set(source, copy)
    for (let index = 0; index < source.childNodes.length; index++) {
      this.mapNodes(source.childNodes[index], copy.childNodes[index])
    }
  }

  /** Remove duplicate identities and copied controls from the tab order. */
  private disableFocusable(root: HTMLElement) {
    for (const element of root.querySelectorAll<HTMLElement>(
      '[id], a, button, input, [tabindex]',
    )) {
      element.removeAttribute('id')
      element.tabIndex = -1
    }
  }

  /** Apply a visual attribute change to the corresponding copy. */
  private copyAttribute(record: MutationRecord, copy: Node) {
    const change = mirroredAttribute(record, copy)
    if (!change) return
    const { source, element, name } = change
    const value = source.getAttribute(name)
    if (value === null) element.removeAttribute(name)
    else element.setAttribute(name, value)
  }

  /** Remove copied nodes deleted from the live tree. */
  private removeNodes(nodes: NodeList) {
    for (const node of nodes) {
      const copy = this.nodes.get(node)
      copy?.parentNode?.removeChild(copy)
    }
  }

  /** Clone inserted content and register its corresponding nodes. */
  private cloneAddedNode(source: Node): Node {
    const copy = source.cloneNode(true)
    this.mapNodes(source, copy)
    if (copy instanceof HTMLElement) this.prepareElement(copy)
    return copy
  }

  /** Insert copies in the same sibling order as the source mutation. */
  private insertAddedNodes(record: MutationRecord, copy: Node) {
    const next = record.nextSibling ? this.nodes.get(record.nextSibling) : null
    const before = next?.parentNode === copy ? next : null
    for (const node of record.addedNodes) {
      if (!(node instanceof HTMLStyleElement)) copy.insertBefore(this.cloneAddedNode(node), before)
    }
  }

  /** Mirror both removals and insertions from one child-list mutation. */
  private copyChildChanges(record: MutationRecord, copy: Node) {
    this.removeNodes(record.removedNodes)
    this.insertAddedNodes(record, copy)
  }

  /** Dispatch a mutation to its corresponding copied node. */
  private applyRecord(record: MutationRecord) {
    const copy = this.nodes.get(record.target)
    if (!copy) return
    if (record.type === 'characterData') copy.nodeValue = record.target.nodeValue
    else if (record.type === 'attributes') this.copyAttribute(record, copy)
    else if (record.type === 'childList') this.copyChildChanges(record, copy)
  }

  /** Apply ordered editor mutations without rebuilding the whole book. */
  apply(records: MutationRecord[]) {
    for (const record of records) this.applyRecord(record)
  }
}
