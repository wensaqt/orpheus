import { describe, expect, it } from 'vitest'

import { MAX_QUERY_LENGTH } from '@front/_features/lexicon/constants'
import { lookupCandidates, parseQuery } from '@front/_features/lexicon/query'

describe('parseQuery', () => {
  it('trims, lower-cases and collapses spaces', () => {
    expect(parseQuery('  Pomme   de TERRE ')).toBe('pomme de terre')
  })

  it('rejects empty, too long and non-string input', () => {
    expect(parseQuery('   ')).toBeNull()
    expect(parseQuery('a'.repeat(MAX_QUERY_LENGTH + 1))).toBeNull()
    expect(parseQuery(42)).toBeNull()
    expect(parseQuery(undefined)).toBeNull()
  })

  it('accepts a query of exactly the maximum length', () => {
    expect(parseQuery('a'.repeat(MAX_QUERY_LENGTH))).toHaveLength(MAX_QUERY_LENGTH)
  })
})

describe('lookupCandidates', () => {
  it('tries the word, then its singular', () => {
    expect(lookupCandidates('rapides')).toEqual(['rapides', 'rapide'])
    expect(lookupCandidates('chevaux')).toEqual(['chevaux', 'cheval', 'chevau'])
    expect(lookupCandidates('vif')).toEqual(['vif'])
  })
})
