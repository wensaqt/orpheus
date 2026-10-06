import { useEffect, useRef, useState } from 'react'

import { findSynonyms } from './actions'
import { type SynonymResult, SynonymStatus } from './types'

// Idle time before searching while typing
const SEARCH_DELAY_MS = 250

/*
 * Synonym search driven by the panel's field. The last result stays available while the next one
 * loads (no flicker), and only the answer to the latest request is kept, even if an older one
 * arrives later. An error clears the result, so stale synonyms are never shown for another word.
 */
export function useSynonyms() {
  const [query, setQueryValue] = useState('')
  const [status, setStatus] = useState(SynonymStatus.Idle)
  const [result, setResult] = useState<SynonymResult | null>(null)
  const timer = useRef<number | null>(null)
  const latestRequest = useRef(0)

  // On unmount: no pending search, and in-flight answers are ignored
  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current)
      latestRequest.current++
    },
    [],
  )

  function schedule(word: string, delay: number) {
    if (timer.current) window.clearTimeout(timer.current)
    const request = ++latestRequest.current
    if (!word) {
      setResult(null)
      setStatus(SynonymStatus.Idle)
      return
    }

    timer.current = window.setTimeout(async () => {
      setStatus(SynonymStatus.Loading)
      try {
        const found = await findSynonyms(word)
        if (request !== latestRequest.current) return
        setResult(found)
        setStatus(SynonymStatus.Done)
      } catch {
        if (request !== latestRequest.current) return
        setResult(null)
        setStatus(SynonymStatus.Error)
      }
    }, delay)
  }

  return {
    query,
    status,
    result,
    setQuery(value: string) {
      setQueryValue(value)
      schedule(value.trim(), SEARCH_DELAY_MS)
    },
    // Enter in the field: without waiting for the delay
    searchNow() {
      schedule(query.trim(), 0)
    },
  }
}
