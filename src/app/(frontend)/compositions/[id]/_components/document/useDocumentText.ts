import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { CLEAR_HISTORY_COMMAND, HISTORY_MERGE_TAG } from 'lexical'
import { useEffect, useRef } from 'react'

import type { Id } from '@/lib/ids'

import { readContent, toEditorStateJson } from '@front/_components/editor/storedContent'
import { useAutosavePlugin } from '@front/_components/editor/plugins/AutosavePlugin'
import { saveDocument } from '@front/_features/binder/actions'
import { replacesShown } from '@front/_features/binder/documentCache'
import { rememberDocument, useDocumentSlot } from '@front/_features/binder/documentStore'
import type { DocumentText, LexicalContent } from '@front/_features/binder/types'
import { SaveStatus } from '@front/_hooks/types'

// Saves the open text and reconciles newer cached versions while there are no local changes
export function useDocumentText(id: Id, text: DocumentText) {
  const [editor] = useLexicalComposerContext()
  // The version shown, to tell a newer one from elsewhere (another tab) from this tab's saves
  const shownVersion = useRef(text.updatedAt)

  async function saveText(content: LexicalContent) {
    const result = await saveDocument(id, content)
    if (result.status === 'done') {
      shownVersion.current = result.data.updatedAt
      rememberDocument(id, { content, updatedAt: result.data.updatedAt })
    }
    return result
  }

  const autosave = useAutosavePlugin(saveText)
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
    shownVersion.current = slot.document.updatedAt
    editor.setEditorState(editor.parseEditorState(toEditorStateJson(slot.document.content)), {
      tag: HISTORY_MERGE_TAG,
    })
    // Undoing would bring this tab's older text back, and save it over the newer one
    editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined)
  }, [slot, autosave.status, editor])

  return autosave
}
