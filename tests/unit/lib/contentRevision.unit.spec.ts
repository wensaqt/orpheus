// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { contentRevision } from '@/lib/contentRevision'

describe('content revisions', () => {
  it('ignores JSON object ordering, including nested Lexical fields', async () => {
    expect(await contentRevision({ root: { type: 'root', children: [], version: 1 } })).toBe(
      await contentRevision({ root: { version: 1, children: [], type: 'root' } }),
    )
  })
  it('distinguishes text edits and preserves array ordering', async () => {
    expect(await contentRevision(['a', 'b'])).not.toBe(await contentRevision(['b', 'a']))
    expect(await contentRevision('first')).not.toBe(await contentRevision('second'))
  })
})
