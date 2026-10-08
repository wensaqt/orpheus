'use client'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { createPortal } from 'react-dom'

import { MAX_BINDER_TITLE_LENGTH } from '@/lib/binder/constants'
import type { Id } from '@/lib/ids'

import { EditorComposer } from '@front/_components/editor/EditorComposer'
import { EditorContent } from '@front/_components/editor/EditorContent'
import { PagedSheet } from '@front/_components/editor/pagination/PagedSheet'
import { useT } from '@front/_components/i18n/I18nProvider'
import { renameBinderItem } from '@front/_features/binder/actions'
import type { DocumentText } from '@front/_features/binder/types'
import { SaveStatus } from '@front/_hooks/types'
import { useTitleField } from '@front/_hooks/useTitleField'

import { useBinder, useRegisterSaver } from '../binder/state/BinderProvider'
import { SAVERS } from '../binder/state/saverKeys'
import { useDocumentTitleSlot } from '../header/documentTitleSlot'
import { useRegisterOpenEditor } from '../editorFocus'
import { CompositionHistoryPlugin } from '../history/CompositionHistoryPlugin'
import { useHistoryState } from '../history/HistoryProvider'
import { useEditorView } from '../editorView'
import { useLayout } from '../page/LayoutProvider'
import styles from './DocumentEditor.module.css'
import { DocumentTitle } from './DocumentTitle'
import { useDocumentText } from './useDocumentText'

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
  const { layout } = useLayout()
  const { bookView } = useEditorView()
  const titleSlot = useDocumentTitleSlot()
  useRegisterOpenEditor(editor)
  const autosave = useDocumentText(id, text)
  const { generation, busy } = useHistoryState()
  const titleField = useTitleField({
    resetVersion: generation,
    title,
    maxLength: MAX_BINDER_TITLE_LENGTH,
    save: (next) => renameBinderItem(id, next),
    // The binder shows the title as it is typed
    onTitle: (next, previous, group) => commands.setTitle(id, next, previous, group),
  })

  useRegisterSaver(SAVERS.documentText(id), autosave)
  useRegisterSaver(SAVERS.documentTitle(id), titleField)

  return (
    <>
      {titleSlot &&
        createPortal(<DocumentTitle {...titleField.inputProps} disabled={busy} />, titleSlot)}
      {/* Only save failures are reported; everything else happens silently */}
      {titleField.status === SaveStatus.Error || autosave.status === SaveStatus.Error ? (
        <p className={styles.saveError} role="alert">
          {t('editor.saveError')}
        </p>
      ) : null}
      <PagedSheet bookView={bookView} settings={layout.page} typography={layout.typography}>
        <EditorContent
          historyPlugin={<CompositionHistoryPlugin id={id} />}
          label={t('editor.textLabel')}
        />
      </PagedSheet>
    </>
  )
}
