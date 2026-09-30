type LexicalNode = { type?: string; text?: string; children?: LexicalNode[] }

// Nœuds dont les enfants sont des lignes distinctes
const LINE_CONTAINERS = new Set(['list', 'listitem'])

const textOf = (node: LexicalNode): string => {
  if (node.text) return node.text
  const separator = node.type && LINE_CONTAINERS.has(node.type) ? '\n' : ''
  return (node.children ?? []).map(textOf).join(separator)
}

// Premiers caractères du texte d'un état Lexical sérialisé, un bloc par ligne
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
