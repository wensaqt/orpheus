import { isRecord } from '@/lib/guards'

// Nodes whose children are separate lines
const LINE_CONTAINERS = new Set(['list', 'listitem'])

// A serialized node's children, or none
const childrenOf = (node: Record<string, unknown>): unknown[] =>
  Array.isArray(node.children) ? node.children : []

// The text of a serialized node; checked as it is read, the stored state being plain JSON
const textOf = (node: unknown): string => {
  if (!isRecord(node)) return ''
  if (typeof node.text === 'string' && node.text) return node.text
  const separator = typeof node.type === 'string' && LINE_CONTAINERS.has(node.type) ? '\n' : ''
  return childrenOf(node).map(textOf).join(separator)
}

// First characters of the text of a serialized Lexical state, one block per line
export function lexicalExcerpt(content: unknown, maxLength: number): string {
  if (!isRecord(content) || !isRecord(content.root)) return ''

  const blocks: string[] = []
  let length = 0
  for (const block of childrenOf(content.root)) {
    if (length >= maxLength) break
    const text = textOf(block).trim()
    if (!text) continue
    blocks.push(text)
    length += text.length
  }

  const excerpt = blocks.join('\n')
  return excerpt.length > maxLength ? `${excerpt.slice(0, maxLength).trimEnd()}…` : excerpt
}
