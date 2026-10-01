'use client'

import React, { useCallback, useState } from 'react'

import type { PageSettings } from '@/lib/pageFormats'

import { PageSheet } from '@front/_components/editor/PageSheet'
import { RichTextEditor } from '@front/_components/editor/RichTextEditor'
import { saveComposition } from '@front/_features/compositions/actions'
import { saveDocument } from '@front/_features/binder/actions'
import type { DocumentPatch, EditorDocument, LexicalContent } from '@front/_features/binder/types'
import type { CompositionPatch } from '@front/_features/compositions/types'
import { useAutosave } from '@front/_hooks/useAutosave'
import { useT } from '@front/_components/i18n/I18nProvider'

import styles from './CompositionEditor.module.css'
import { SynonymsPanel } from './SynonymsPanel'

type CompositionEditorProps = {
  id: number
  title: string
  page: PageSettings
  // The document shown on the sheet; none when the binder is empty
  document: EditorDocument | null
}

// Minimal editing screen: frameless title above the sheet, then the sheet
export function CompositionEditor({ id, title, page, document }: CompositionEditorProps) {
  const t = useT()
  const [currentTitle, setCurrentTitle] = useState(title)
  const saveTitle = useCallback((patch: CompositionPatch) => saveComposition(id, patch), [id])
  const titleAutosave = useAutosave(saveTitle)
  const documentId = document?.id
  const saveText = useCallback(
    (patch: DocumentPatch) => saveDocument(documentId!, patch),
    [documentId],
  )
  const textAutosave = useAutosave(saveText)
  const failed = titleAutosave.status === 'error' || textAutosave.status === 'error'

  return (
    <div className={styles.screen}>
      <div className={styles.desk}>
        {/* The column takes the sheet's width, and the title aligns with it */}
        <div className={styles.column}>
          <input
            className={styles.title}
            aria-label={t('editor.titleLabel')}
            value={currentTitle}
            onChange={(e) => {
              setCurrentTitle(e.target.value)
              titleAutosave.queue({ title: e.target.value })
            }}
            onBlur={() => void titleAutosave.flush()}
          />
          {/* Only save failures are reported; everything else happens silently */}
          {failed && (
            <p className={styles.saveError} role="alert">
              {t('editor.saveError')}
            </p>
          )}
          {document ? (
            <PageSheet settings={page}>
              <RichTextEditor
                initialContent={document.content}
                placeholder={t('editor.placeholder')}
                // editorState.toJSON() always produces a state matching the field's schema
                onChange={(next) => textAutosave.queue({ content: next as LexicalContent })}
              />
            </PageSheet>
          ) : (
            <p className={styles.empty}>{t('binder.empty')}</p>
          )}
        </div>
        <div className={styles.aside}>
          <SynonymsPanel />
        </div>
      </div>
    </div>
  )
}
