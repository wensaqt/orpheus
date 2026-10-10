import { useCallback, useMemo } from 'react'

import { isIdList, type Id } from '@/lib/ids'
import type { BinderEntry } from '@front/_features/binder/types'
import { useStoredState } from '@front/_hooks/useStoredState'
import { STORAGE_KEYS } from '@front/_lib/preferences'

export function useCollapsedFolders(compositionId: Id, entries: BinderEntry[]) {
  const [ids, setIds] = useStoredState(STORAGE_KEYS.collapsedFolders(compositionId), [], isIdList)
  // Stale stored IDs are harmless; only existing folders participate in the view.
  const folders = useMemo(
    () => new Set(entries.filter((entry) => entry.kind === 'folder').map((entry) => entry.id)),
    [entries],
  )
  const collapsed = useMemo(() => new Set(ids.filter((id) => folders.has(id))), [ids, folders])
  const setFolderOpen = useCallback(
    (id: Id, open: boolean) => {
      if (!folders.has(id) || collapsed.has(id) !== open) return
      const next = new Set(collapsed)
      if (open) next.delete(id)
      else next.add(id)
      setIds([...next])
    },
    [collapsed, folders, setIds],
  )
  return { collapsed, setFolderOpen }
}
