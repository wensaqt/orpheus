import { ScoreError } from './errors'
import { validateScoreImport } from './validation'

export function children(parent: Element, name: string): Element[] {
  return Array.from(parent.children).filter((child) => child.localName === name)
}

export function child(parent: Element, name: string): Element | null {
  return children(parent, name)[0] ?? null
}

export function value(parent: Element, name: string): string | null {
  return child(parent, name)?.textContent?.trim() ?? null
}

export function required(parent: Element, name: string): string {
  const result = value(parent, name)
  if (!result) throw new ScoreError('missingField', { field: name })
  return result
}

export function setValue(parent: Element, name: string, text: string): void {
  let element = child(parent, name)
  if (!element) {
    element = parent.ownerDocument.createElement(name)
    parent.appendChild(element)
  }
  element.textContent = text
}

export function parse(xml: string): Document {
  validateScoreImport(xml)
  return new DOMParser().parseFromString(xml, 'application/xml')
}
