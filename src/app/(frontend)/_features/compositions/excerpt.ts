type LexicalNode = { type?: string; text?: string; children?: LexicalNode[] }

// Nodes whose children are separate lines
const LINE_CONTAINERS = new Set(['list', 'listitem'])

const textOf = (node: LexicalNode): string => {
  if (node.text) return node.text
  const separator = node.type && LINE_CONTAINERS.has(node.type) ? '\n' : ''
  return (node.children ?? []).map(textOf).join(separator)
}

// First characters of the text of a serialized Lexical state, one block per line
export function lexicalExcerpt(content: unknown, maxLength: number): string {
  const root = (content as { root?: LexicalNode } | null)?.root
  if (!root?.children) return ''

  const blocks: string[] = []
  let length = 0
  for (const block of root.children) {
    if (length >= maxLength) break
    const text = textOf(block).trim()
    if (!text) continue
    blocks.push(text)
    length += text.length
  }

  const excerpt = blocks.join('\n')
  return excerpt.length > maxLength ? `${excerpt.slice(0, maxLength).trimEnd()}…` : excerpt
}
