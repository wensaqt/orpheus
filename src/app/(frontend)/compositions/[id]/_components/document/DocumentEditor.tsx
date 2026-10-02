'use client'

import { useState } from 'react'

import { MAX_BINDER_TITLE_LENGTH } from '@/lib/binder/constants'

import { EditorComposer } from '@front/_components/editor/EditorComposer'
import { EditorContent } from '@front/_components/editor/EditorContent'
import { PageSheet } from '@front/_components/editor/PageSheet'
import { useAutosavePlugin } from '@front/_components/editor/plugins/AutosavePlugin'
import { useT } from '@front/_components/i18n/I18nProvider'
import { renameBinderItem, saveDocument } from '@front/_features/binder/actions'
import type { EditorDocument } from '@front/_features/binder/types'
import { useTitleField } from '@front/_hooks/useTitleField'

import { latestContent, rememberSaved } from '../binder/state/documentDrafts'
import { useBinder, useRegisterSaver } from '../binder/state/BinderProvider'
import { SAVERS } from '../binder/state/useSaveRegistry'
import styles from './DocumentEditor.module.css'
import { DocumentTitle } from './DocumentTitle'

/*
 * The open document: its title above the sheet, then its text, in one Lexical composer (the
 * title hands the caret to the text and back).
 */
export function DocumentEditor({ document }: { document: EditorDocument }) {
  // Read once: the composer only takes its initial state on mount
  const [initialContent] = useState(() => latestContent(document.id, document))
  return (
    <EditorComposer initialContent={initialContent}>
      <DocumentPage document={document} />
    </EditorComposer>
  )
}

/*
 * Inside the composer. The title and the text save on their own and register with the binder,
 * so leaving the document first waits for them, and deleting it drops them.
 */
function DocumentPage({ document }: { document: EditorDocument }) {
  const t = useT()
  const { page, commands } = useBinder()
  const { id } = document

  const text = useAutosavePlugin(async (content) => {
    const result = await saveDocument(id, content)
    if (result.status === 'done') rememberSaved(id, content, result.data.updatedAt)
    return result
  })
  const title = useTitleField({
    title: document.title,
    maxLength: MAX_BINDER_TITLE_LENGTH,
    save: (next) => renameBinderItem(id, next),
    // The binder shows the title as it is typed
    onTitle: (next) => commands.setTitle(id, next),
  })

  useRegisterSaver(SAVERS.documentText(id), text)
  useRegisterSaver(SAVERS.documentTitle(id), title)

  return (
    <>
      <DocumentTitle {...title.inputProps} />
      {/* Only save failures are reported; everything else happens silently */}
      {(title.status === 'error' || text.status === 'error') && (
        <p className={styles.saveError} role="alert">
          {t('editor.saveError')}
        </p>
      )}
      <PageSheet settings={page}>
        <EditorContent placeholder={t('editor.placeholder')} />
      </PageSheet>
    </>
  )
}
