import type { Id } from '@/lib/ids'

export type HistoryScope =
  | { kind: 'text'; id: Id }
  | { kind: 'layout' }
  | { kind: 'binder'; ids: Id[]; operation: 'rename' | 'move' }
export type HistoryChange = {
  isEmpty?: () => boolean
  scope: HistoryScope
  undo: () => boolean | Promise<boolean>
  redo: () => boolean | Promise<boolean>
}
export const MAX_HISTORY_STEPS = 100
const INITIAL = { canUndo: false, canRedo: false, busy: false, generation: 0 }
type Entry = HistoryChange & { token?: object }

// A composition session's ordered actions. Failed restoration leaves the cursor where it was.
export function createHistoryStore() {
  let past: Entry[] = []
  let future: Entry[] = []
  let snapshot = INITIAL
  let replaying = false
  let mergeBarrier = 0
  let prepare = async () => true
  let openDocument = async (_id: Id) => false
  let reportError = () => {}
  const listeners = new Set<() => void>()
  const publish = (busy = snapshot.busy, generation = snapshot.generation) => {
    snapshot = { canUndo: past.length > 0, canRedo: future.length > 0, busy, generation }
    listeners.forEach((listener) => listener())
  }
  const perform = async (action: () => boolean | Promise<boolean>, onError = reportError) => {
    while (snapshot.busy) await waitUntilIdle()
    publish(true)
    try {
      if (!(await prepare())) {
        onError()
        return false
      }
      const accepted = await action()
      if (!accepted) onError()
      return accepted
    } catch {
      onError()
      return false
    } finally {
      publish(false)
    }
  }
  type ReplayRequest = { direction: 'undo' | 'redo'; resolve: (accepted: boolean) => void }
  const pending: ReplayRequest[] = []
  let draining = false
  const waitUntilIdle = () =>
    new Promise<void>((resolve) => {
      const listener = () => {
        if (snapshot.busy) return
        listeners.delete(listener)
        resolve()
      }
      listeners.add(listener)
    })
  async function drainReplays() {
    draining = true
    const completed: { request: ReplayRequest; accepted: boolean }[] = []
    // Consecutive shortcuts share one save boundary; restored text/layout save after the batch.
    const accepted = await perform(async () => {
      replaying = true
      try {
        while (pending.length) {
          const request = pending.shift()
          if (!request) break
          const result = { request, accepted: false }
          completed.push(result)
          const source = request.direction === 'undo' ? past : future
          const destination = request.direction === 'undo' ? future : past
          const entry = source.at(-1)
          if (!entry) {
            result.accepted = true
            continue
          }
          if (!(await entry[request.direction]())) return false
          result.accepted = true
          source.pop()
          destination.push(entry)
          mergeBarrier++
          publish(true, snapshot.generation + 1)
        }
        return true
      } finally {
        replaying = false
      }
    })
    completed.forEach(({ request, accepted }) => request.resolve(accepted))
    if (!accepted) pending.splice(0).forEach((request) => request.resolve(false))
    draining = false
    if (pending.length) void drainReplays()
  }
  const replay = (direction: 'undo' | 'redo') =>
    new Promise<boolean>((resolve) => {
      pending.push({ direction, resolve })
      if (!draining) void drainReplays()
    })
  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => INITIAL,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    get mergeBarrier() {
      return mergeBarrier
    },
    configure(options: {
      prepare: () => Promise<boolean>
      openDocument: (id: Id) => Promise<boolean>
      reportError: () => void
    }) {
      prepare = options.prepare
      openDocument = options.openDocument
      reportError = options.reportError
    },
    canMerge: (token: object) => past.at(-1)?.token === token && future.length === 0,
    openDocument: (id: Id) => openDocument(id),
    record(change: HistoryChange, token?: object) {
      if (replaying) return
      const last = past.at(-1)
      if (token && last?.token === token && future.length === 0) {
        if (change.isEmpty?.()) past.pop()
        else past[past.length - 1] = { ...change, undo: last.undo, token }
      } else {
        past.push({ ...change, token })
        if (past.length > MAX_HISTORY_STEPS) past.shift()
      }
      future = []
      if (change.scope.kind !== 'text') mergeBarrier++
      publish()
    },
    discard(predicate: (scope: HistoryScope) => boolean) {
      if (replaying) return
      past = past.filter((entry) => !predicate(entry.scope))
      future = future.filter((entry) => !predicate(entry.scope))
      mergeBarrier++
      publish()
    },
    perform,
    undo: () => replay('undo'),
    redo: () => replay('redo'),
  }
}
export type HistoryStore = ReturnType<typeof createHistoryStore>
