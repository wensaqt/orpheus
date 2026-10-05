'use client'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { CLEAR_HISTORY_COMMAND, HISTORY_MERGE_TAG } from 'lexical'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

import { MAX_BINDER_TITLE_LENGTH } from '@/lib/binder/constants'
import type { Id } from '@/lib/ids'

import { EditorComposer } from '@front/_components/editor/EditorComposer'
import { EditorContent } from '@front/_components/editor/EditorContent'
import { PagedSheet } from '@front/_components/editor/pagination/PagedSheet'
import { useAutosavePlugin } from '@front/_components/editor/plugins/AutosavePlugin'
import { useT } from '@front/_components/i18n/I18nProvider'
import { renameBinderItem, saveDocument } from '@front/_features/binder/actions'
import { type DocumentText, replacesShown } from '@front/_features/binder/documentCache'
import { rememberDocument, useDocumentSlot } from '@front/_features/binder/documentStore'
import type { LexicalContent } from '@front/_features/binder/types'
import { useTitleField } from '@front/_hooks/useTitleField'

import { useBinder, useRegisterSaver } from '../binder/state/BinderProvider'
import { SAVERS } from '../binder/state/useSaveRegistry'
import { useDocumentTitleSlot } from '../header/documentTitleSlot'
import { usePageSettings } from '../page/PageSettingsProvider'
import styles from './DocumentEditor.module.css'
import { DocumentTitle } from './DocumentTitle'

type DocumentEditorProps = {
  id: Id
  // Live, from the binder
  title: string
  // The text to start from, read once by the composer
  text: DocumentText
}

/*
 * The open document: its title (shown in the editor's header), then its text on its pages, in
 * one Lexical composer (the title hands the caret to the text and back).
 */
export function DocumentEditor({ id, title, text }: DocumentEditorProps) {
  return (
    <EditorComposer initialContent={text.content}>
      <DocumentPage id={id} title={title} text={text} />
    </EditorComposer>
  )
}

/*
 * Inside the composer. The title and the text save on their own and register with the binder,
 * so leaving the document first waits for them, and deleting it drops them.
 */
function DocumentPage({ id, title, text }: DocumentEditorProps) {
  const t = useT()
  const [editor] = useLexicalComposerContext()
  const { commands } = useBinder()
  const { settings: page } = usePageSettings()
  const titleSlot = useDocumentTitleSlot()
  // The version shown, to tell a newer one from elsewhere (another tab) from this tab's saves
  const shownVersion = useRef(text.updatedAt)

  const autosave = useAutosavePlugin(async (content) => {
    const result = await saveDocument(id, content)
    if (result.status === 'done') {
      shownVersion.current = result.data.updatedAt
      rememberDocument(id, { content, updatedAt: result.data.updatedAt })
    }
    return result
  })
  const titleField = useTitleField({
    title,
    maxLength: MAX_BINDER_TITLE_LENGTH,
    save: (next) => renameBinderItem(id, next),
    // The binder shows the title as it is typed
    onTitle: (next) => commands.setTitle(id, next),
  })

  useRegisterSaver(SAVERS.documentText(id), autosave)
  useRegisterSaver(SAVERS.documentTitle(id), titleField)

  /*
   * A newer version arrived (the document was changed in another tab, and the cache checked
   * it): shown in place if the writer has nothing unsaved here, as a history merge so it is
   * not saved again, and with the undo history cleared.
   */
  const slot = useDocumentSlot(id)
  useEffect(() => {
    if (slot?.status !== 'ready' || autosave.status !== 'saved') return
    const shown = editor.getEditorState().toJSON() as LexicalContent
    if (!replacesShown(shownVersion.current, shown, slot.document)) return
    shownVersion.current = slot.document.updatedAt
    editor.setEditorState(editor.parseEditorState(JSON.stringify(slot.document.content)), {
      tag: HISTORY_MERGE_TAG,
    })
    // Undoing would bring this tab's older text back, and save it over the newer one
    editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined)
  }, [slot, autosave.status, editor])

  return (
    <>
      {titleSlot && createPortal(<DocumentTitle {...titleField.inputProps} />, titleSlot)}
      {/* Only save failures are reported; everything else happens silently */}
      {titleField.status === 'error' || autosave.status === 'error' ? (
        <p className={styles.saveError} role="alert">
          {t('editor.saveError')}
        </p>
      ) : null}
      <PagedSheet settings={page}>
        <EditorContent placeholder={t('editor.placeholder')} />
      </PagedSheet>
    </>
  )
}
