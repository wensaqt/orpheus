import { useCallback, useRef } from 'react'

import type { Id } from '@/lib/ids'

import type { SaveControls } from '@front/_hooks/useAutosave'

// The key each saver registers under, naming what it saves
export const SAVERS = {
  compositionTitle: 'composition-title',
  documentText: (id: Id) => `document:${id}`,
  documentTitle: (id: Id) => `document-title:${id}`,
}

/*
 * The savers currently mounted (the open document's text and title, the composition's title),
 * so that leaving a document can first wait for its changes to be saved, and deleting one can
 * drop them.
 */
export function useSaveRegistry() {
  const savers = useRef(new Map<string, SaveControls>())

  const register = useCallback((key: string, controls: SaveControls) => {
    savers.current.set(key, controls)
    return () => {
      if (savers.current.get(key) === controls) savers.current.delete(key)
    }
  }, [])

  // Saves everything pending; true when all of it is saved
  const flushAll = useCallback(async () => {
    const results = await Promise.all([...savers.current.values()].map((saver) => saver.flush()))
    return results.every(Boolean)
  }, [])

  // Drops what has not been saved for these documents (they are being deleted)
  const cancelDocuments = useCallback((ids: Iterable<Id>) => {
    for (const id of ids) {
      // Only the open document has savers mounted
      savers.current.get(SAVERS.documentText(id))?.cancel()
      savers.current.get(SAVERS.documentTitle(id))?.cancel()
    }
  }, [])

  return { register, flushAll, cancelDocuments }
}
