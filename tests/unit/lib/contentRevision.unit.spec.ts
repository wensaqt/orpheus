// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { canonicalContent, contentRevision, isContentRevision } from '@/lib/contentRevision'

describe('content revisions', () => {
  it('recognizes generated SHA-256 revisions', async () => {
    expect(isContentRevision(await contentRevision({ text: 'Study' }))).toBe(true)
  })
  it.each([
    undefined,
    null,
    123,
    true,
    {},
    [],
    ['a'.repeat(64)],
    '',
    'a'.repeat(63),
    'a'.repeat(65),
    'A'.repeat(64),
    'g'.repeat(64),
  ])('rejects malformed or non-string revisions: %j', (value) => {
    expect(isContentRevision(value)).toBe(false)
  })
  it('omits undefined object fields and retains array positions and scalar fallback', async () => {
    expect(await contentRevision({ present: 1, missing: undefined })).toBe(
      await contentRevision({ present: 1 }),
    )
    expect(canonicalContent([undefined, { missing: undefined, present: 1 }, null])).toBe(
      '[null,{"present":1},null]',
    )
    expect(canonicalContent(undefined)).toBe('null')
  })
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
