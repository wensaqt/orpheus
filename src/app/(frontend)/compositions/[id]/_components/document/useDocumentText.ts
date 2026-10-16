import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { CLEAR_HISTORY_COMMAND, HISTORY_MERGE_TAG } from 'lexical'
import { useEffect, useRef, useState } from 'react'

import { contentRevision } from '@/lib/contentRevision'
import type { Id } from '@/lib/ids'

import { readContent, toEditorStateJson } from '@front/_components/editor/storedContent'
import { useAutosavePlugin } from '@front/_components/editor/plugins/AutosavePlugin'
import { readDraft, writeDraft, removeDraft } from '@front/_features/binder/documentDraft'
import { isContentUpdate } from '@front/_components/editor/contentUpdates'
import { useBinder } from '../binder/state/BinderProvider'
import { saveDocument } from '@front/_features/binder/actions'
import { replacesShown } from '@front/_features/binder/documentCache'
import {
  documentCacheGeneration,
  rememberDocument,
  useDocumentSlot,
} from '@front/_features/binder/documentStore'
import type { DocumentText, LexicalContent } from '@front/_features/binder/types'
import { SaveStatus } from '@front/_hooks/types'

// Saves the open text and reconciles newer cached versions while there are no local changes
export function useDocumentText(id: Id, text: DocumentText) {
  const cacheGeneration = useRef(documentCacheGeneration()).current
  const { ownerId } = useBinder()
  const [draftUnavailable, setDraftUnavailable] = useState(false)
  // The mounted composer starts from this body; router/cache renders must not change its base.
  const [initialContent] = useState(() => text.content)
  const revision = useRef<Promise<string> | null>(null)
  const [editor] = useLexicalComposerContext()
  // The version shown, to tell a newer one from elsewhere (another tab) from this tab's saves
  const shownVersion = useRef(text.updatedAt)
  const active = useRef(true)

  async function saveText(content: LexicalContent) {
    const result = await saveDocument(
      id,
      content,
      await (revision.current ??= contentRevision(initialContent)),
    )
    if (result.status === 'done') {
      // A detached editor must not remove or overwrite a newer mounting's draft.
      if (active.current) {
        revision.current = Promise.resolve(result.data.revision)
        const current = readContent(editor)
        if (JSON.stringify(content) === JSON.stringify(current)) {
          removeDraft(ownerId, id)
          setDraftUnavailable(false)
        } else
          setDraftUnavailable(
            !writeDraft(ownerId, id, { content: current, revision: result.data.revision }),
          )
        shownVersion.current = result.data.updatedAt
      }
      rememberDocument(id, { content, updatedAt: result.data.updatedAt }, cacheGeneration)
    }
    return result
  }

  const autosave = useAutosavePlugin(saveText)
  const { queue } = autosave
  useEffect(() => {
    active.current = true
    const draft = readDraft(ownerId, id)
    if (draft) {
      revision.current = Promise.resolve(draft.revision)
      // Restoring the draft is initialization; queue its save once, without an undo entry.
      editor.setEditorState(editor.parseEditorState(toEditorStateJson(draft.content)), {
        tag: HISTORY_MERGE_TAG,
      })
      queue()
    }
    const unregister = editor.registerUpdateListener((update) => {
      if (!isContentUpdate(update)) return
      const content = readContent(editor)
      void (revision.current ??= contentRevision(initialContent)).then((expected) => {
        if (active.current)
          setDraftUnavailable(!writeDraft(ownerId, id, { content, revision: expected }))
      })
    })
    return () => {
      active.current = false
      unregister()
    }
  }, [editor, id, ownerId, queue, initialContent])
  /*
   * A newer version arrived (the document was changed in another tab, and the cache checked
   * it): shown in place if the writer has nothing unsaved here, as a history merge so it is
   * not saved again, and with the undo history cleared.
   */
  const slot = useDocumentSlot(id)
  useEffect(() => {
    if (slot?.status !== 'ready' || autosave.status !== SaveStatus.Saved) return
    const shown = readContent(editor)
    if (!replacesShown(shownVersion.current, shown, slot.document)) return
    revision.current = contentRevision(slot.document.content)
    shownVersion.current = slot.document.updatedAt
    editor.setEditorState(editor.parseEditorState(toEditorStateJson(slot.document.content)), {
      tag: HISTORY_MERGE_TAG,
    })
    // Undoing would bring this tab's older text back, and save it over the newer one
    editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined)
  }, [slot, autosave.status, editor])

  return { ...autosave, draftUnavailable }
}
