import { ScoreError } from './errors'
import { validateScoreImport } from './validation'

/** Find direct child elements by local name, including namespaced MusicXML. */
/** Find the first direct child; nested descendants must not match. */
export function findXmlChildren(parent: Element, name: string): Element[] {
  return Array.from(parent.children).filter((child) => child.localName === name)
}

/** Find the first direct child; nested descendants must not match. */
export function findXmlChild(parent: Element, name: string): Element | null {
  return Array.from(parent.children).find((element) => element.localName === name) ?? null
}

/** Read trimmed text from a direct child, preserving a missing value as null. */
export function readXmlValue(parent: Element, name: string): string | null {
  return findXmlChild(parent, name)?.textContent?.trim() ?? null
}

/** Read a required field or report its missing MusicXML name. */
export function requireXmlValue(parent: Element, name: string): string {
  const result = readXmlValue(parent, name)
  if (!result) throw new ScoreError('missingField', { field: name })
  return result
}

/** Update a direct child, creating it when absent. */
export function setXmlValue(parent: Element, name: string, text: string): void {
  let element = findXmlChild(parent, name)
  if (!element) {
    element = parent.ownerDocument.createElement(name)
    parent.appendChild(element)
  }
  element.textContent = text
}

/** Validate the import before constructing its browser DOM. */
export function parseMusicXml(xml: string): Document {
  validateScoreImport(xml)
  return new DOMParser().parseFromString(xml, 'application/xml')
}
