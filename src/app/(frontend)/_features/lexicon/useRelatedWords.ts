import { useEffect, useRef, useState } from 'react'

import { findRelatedWords } from './actions'
import type { LexiconResult, Relation } from './types'

// Idle delay before searching while typing
const SEARCH_DELAY = 250

export type LexiconStatus = 'idle' | 'loading' | 'done' | 'error'

/*
 * Related-word search driven by the panel's input. The last result stays available while the
 * next one loads (no flicker), and only the response to the latest request is kept, even if an
 * older one arrives later.
 */
export function useRelatedWords() {
  const [query, setQueryValue] = useState('')
  const [relation, setRelationValue] = useState<Relation>('synonyms')
  const [status, setStatus] = useState<LexiconStatus>('idle')
  const [result, setResult] = useState<LexiconResult | null>(null)
  const timer = useRef<number | null>(null)
  const latestRequest = useRef(0)

  // On unmount: no pending search, and in-flight responses are ignored
  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current)
      latestRequest.current++
    },
    [],
  )

  function schedule(word: string, nextRelation: Relation, delay: number) {
    if (timer.current) window.clearTimeout(timer.current)
    const request = ++latestRequest.current
    if (!word) {
      setResult(null)
      setStatus('idle')
      return
    }

    timer.current = window.setTimeout(async () => {
      setStatus('loading')
      try {
        const found = await findRelatedWords(word, nextRelation)
        if (request !== latestRequest.current) return
        setResult(found)
        setStatus('done')
      } catch {
        if (request === latestRequest.current) setStatus('error')
      }
    }, delay)
  }

  return {
    query,
    relation,
    status,
    result,
    setQuery(value: string) {
      setQueryValue(value)
      schedule(value.trim(), relation, SEARCH_DELAY)
    },
    // Changing the relation immediately re-runs the search for the current word
    setRelation(next: Relation) {
      setRelationValue(next)
      schedule(query.trim(), next, 0)
    },
    // Enter in the input: search without waiting for the delay
    searchNow() {
      schedule(query.trim(), relation, 0)
    },
  }
}
