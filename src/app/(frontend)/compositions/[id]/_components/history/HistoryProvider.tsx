'use client'
import {
  createContext,
  type KeyboardEvent,
  type ReactNode,
  use,
  useState,
  useSyncExternalStore,
} from 'react'
import { createHistoryStore } from './historyStore'
const HistoryContext = createContext<ReturnType<typeof createHistoryStore> | null>(null)
export function HistoryProvider({ children }: { children: ReactNode }) {
  const [history] = useState(createHistoryStore)
  return <HistoryContext value={history}>{children}</HistoryContext>
}
export const useOptionalHistory = () => use(HistoryContext)
export function useEditorHistory() {
  const history = useOptionalHistory()
  if (!history) throw new Error('useEditorHistory must be used inside <HistoryProvider>')
  return history
}
export function useHistoryState() {
  const history = useEditorHistory()
  return useSyncExternalStore(history.subscribe, history.getSnapshot, history.getServerSnapshot)
}
// Input drafts keep native undo; applied numeric layout values participate in composition undo.
export function historyShortcut(
  history: ReturnType<typeof createHistoryStore>,
  event: KeyboardEvent,
) {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return
  const target = event.target
  if (
    target instanceof HTMLElement &&
    target.closest(
      'input:not([data-layout-history]):not([type=radio]):not([type=checkbox]), textarea',
    )
  )
    return
  const key = event.key.toLowerCase()
  const undo = key === 'z' && !event.shiftKey
  const redo = (key === 'z' && event.shiftKey) || (key === 'y' && event.ctrlKey && !event.shiftKey)
  if (!undo && !redo) return
  event.preventDefault()
  event.stopPropagation()
  void (undo ? history.undo() : history.redo())
}
