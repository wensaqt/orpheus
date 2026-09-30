import { describe, expect, it } from 'vitest'

import { lexicalExcerpt } from '@front/_features/compositions/excerpt'

const text = (value: string) => ({ type: 'text', text: value })
const block = (type: string, ...children: object[]) => ({ type, children })
const state = (...children: object[]) => ({ root: { type: 'root', children } })

describe('lexicalExcerpt', () => {
  it('puts one block per line and skips empty blocks', () => {
    const content = state(
      block('heading', text('Eurydice')),
      block('paragraph'),
      block('paragraph', text('She walked '), text('behind him.')),
    )
    expect(lexicalExcerpt(content, 200)).toBe('Eurydice\nShe walked behind him.')
  })

  it('separates list items', () => {
    const list = block('list', block('listitem', text('one')), block('listitem', text('two')))
    expect(lexicalExcerpt(state(list), 200)).toBe('one\ntwo')
  })

  it('truncates with an ellipsis', () => {
    expect(lexicalExcerpt(state(block('paragraph', text('abcdefghij'))), 4)).toBe('abcd…')
  })

  it('returns an empty string for missing or invalid content', () => {
    expect(lexicalExcerpt(null, 10)).toBe('')
    expect(lexicalExcerpt({ foo: 1 }, 10)).toBe('')
  })
})
