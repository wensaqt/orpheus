import { useCallback, useRef, useState } from 'react'

// Full XML snapshots are bounded by both count and retained UTF-16 bytes.
export const MAX_SCORE_HISTORY_STEPS = 100
export const MAX_SCORE_HISTORY_BYTES = 16_000_000

type Snapshot = { xml: string; bytes: number }

function trimHistory(snapshots: Snapshot[]): void {
  let bytes = snapshots.reduce((total, snapshot) => total + snapshot.bytes, 0)
  while (snapshots.length > MAX_SCORE_HISTORY_STEPS || bytes > MAX_SCORE_HISTORY_BYTES) {
    bytes -= snapshots.shift()!.bytes
  }
}

export function useScoreXml(initialXml: string) {
  const [xml, setXml] = useState(initialXml)
  const xmlRef = useRef(xml)
  // Commands may be batched before React renders, so history and XML share synchronous refs.
  const history = useRef<Snapshot[]>([])
  const [canUndo, setCanUndo] = useState(false)

  // Stable identity keeps the registered undo command stable across unrelated renders.
  // The ref and React setter are stable, hence no dependencies.
  const replaceXml = useCallback((next: string) => {
    xmlRef.current = next
    setXml(next)
  }, [])

  function commitXml(next: string): boolean {
    const before = xmlRef.current
    if (before === next) return false
    history.current.push({ xml: before, bytes: before.length * 2 })
    trimHistory(history.current)
    setCanUndo(history.current.length > 0)
    replaceXml(next)
    return true
  }

  const restorePreviousXml = useCallback((): boolean => {
    const previous = history.current.pop()
    if (!previous) return false
    replaceXml(previous.xml)
    setCanUndo(history.current.length > 0)
    return true
  }, [replaceXml])

  return { xml, xmlRef, canUndo, commitXml, restorePreviousXml }
}
