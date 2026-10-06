import type { BinderItem } from '@/payload-types'

import { PAGE_BREAK_TYPE } from '@front/_components/editor/constants'

// Serialized Lexical documents for tests: French prose with headings, quotes and lists

// A document's content, as saved
export type DocumentContent = NonNullable<BinderItem['content']>
type SerializedNode = Record<string, unknown>

const WORDS = `le la les un une des et ou mais donc chant lyre ombre fleuve nuit regard voix
silence pierre souffle lumière chemin mémoire retour descente rive Eurydice Orphée enfers
musique corde larme cœur âme destin promesse oubli aube crépuscule écho murmure seuil`.split(/\s+/)

const text = (value: string): SerializedNode => ({
  type: 'text',
  version: 1,
  text: value,
  format: 0,
  style: '',
  mode: 'normal',
  detail: 0,
})
const block = (type: string, extra: object, children: SerializedNode[]): SerializedNode => ({
  type,
  version: 1,
  direction: 'ltr',
  format: '',
  indent: 0,
  children,
  ...extra,
})

// Deterministic sentences, so a test lays out the same way every run
function sentences(seed: number) {
  let state = seed
  const random = () => (state = (state * 16807) % 2147483647) / 2147483647
  return () => {
    const words = Array.from(
      { length: 8 + Math.floor(random() * 12) },
      () => WORDS[Math.floor(random() * WORDS.length)],
    ).join(' ')
    return `${words[0].toUpperCase()}${words.slice(1)}.`
  }
}

// A paragraph of this text; an empty one has no text node, as the editor saves it
export const paragraphNode = (value: string) =>
  block('paragraph', { textFormat: 0, textStyle: '' }, value ? [text(value)] : [])

// A manual page break, as the editor saves it
export const pageBreakNode = (): SerializedNode => ({ type: PAGE_BREAK_TYPE, version: 1 })

// A document made of these blocks, in order
export const documentOf = (children: SerializedNode[]): DocumentContent => ({
  root: { ...block('root', {}, children), type: 'root', children },
})

// About `paragraphs` paragraphs of three sentences, with a heading, a quote and a list now and then
export function prose(paragraphs: number, seed = 7) {
  const sentence = sentences(seed)
  const children: SerializedNode[] = []
  for (let index = 0; index < paragraphs; index++) {
    if (index % 10 === 0)
      children.push(block('heading', { tag: 'h2' }, [text(`Chant ${index / 10 + 1}`)]))
    children.push(paragraphNode(`${sentence()} ${sentence()} ${sentence()}`))
    if (index % 10 === 4) children.push(block('quote', {}, [text(`${sentence()} ${sentence()}`)]))
    if (index % 10 === 7) {
      children.push(
        block(
          'list',
          { listType: 'bullet', start: 1, tag: 'ul' },
          [1, 2, 3].map((value) => block('listitem', { value }, [text(sentence())])),
        ),
      )
    }
  }
  return documentOf(children)
}
