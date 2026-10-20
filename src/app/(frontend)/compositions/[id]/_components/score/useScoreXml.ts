import { useCallback, useRef, useState } from 'react'

// Full XML snapshots are bounded by both count and retained UTF-16 bytes.
export const MAX_SCORE_HISTORY_STEPS = 100
export const MAX_SCORE_HISTORY_BYTES = 16_000_000

type Snapshot = { xml: string; bytes: number }

function trimHistory(past: Snapshot[], future: Snapshot[]): void {
  let bytes = [...past, ...future].reduce((total, snapshot) => total + snapshot.bytes, 0)
  while (past.length + future.length > MAX_SCORE_HISTORY_STEPS || bytes > MAX_SCORE_HISTORY_BYTES) {
    const removed = past.shift() ?? future.shift()
    if (!removed) break
    bytes -= removed.bytes
  }
}

function snapshot(xml: string): Snapshot {
  return { xml, bytes: xml.length * 2 }
}

export function useScoreXml(initialXml: string) {
  const [xml, setXml] = useState(initialXml)
  const xmlRef = useRef(xml)
  // Commands may be batched before React renders, so history and XML share synchronous refs.
  const past = useRef<Snapshot[]>([])
  const future = useRef<Snapshot[]>([])
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const generation = useRef(0)

  // Stable identity keeps the registered undo command stable across unrelated renders.
  // The ref and React setter are stable, hence no dependencies.
  const replaceXml = useCallback((next: string) => {
    xmlRef.current = next
    generation.current += 1
    setXml(next)
  }, [])

  function commitXml(next: string): boolean {
    const before = xmlRef.current
    if (before === next) return false
    past.current.push(snapshot(before))
    future.current = []
    trimHistory(past.current, future.current)
    setCanUndo(past.current.length > 0)
    setCanRedo(false)
    replaceXml(next)
    return true
  }

  const restorePreviousXml = useCallback((): boolean => {
    const previous = past.current.pop()
    if (!previous) return false
    future.current.push(snapshot(xmlRef.current))
    trimHistory(past.current, future.current)
    replaceXml(previous.xml)
    setCanUndo(past.current.length > 0)
    setCanRedo(future.current.length > 0)
    return true
  }, [replaceXml])

  const restoreNextXml = useCallback((): boolean => {
    const next = future.current.pop()
    if (!next) return false
    past.current.push(snapshot(xmlRef.current))
    trimHistory(past.current, future.current)
    replaceXml(next.xml)
    setCanUndo(past.current.length > 0)
    setCanRedo(future.current.length > 0)
    return true
  }, [replaceXml])

  return {
    xml,
    xmlRef,
    generation,
    canUndo,
    canRedo,
    commitXml,
    restorePreviousXml,
    restoreNextXml,
  }
}
