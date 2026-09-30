'use client'

import React, { useCallback, useState } from 'react'

import type { PageSettings } from '@/lib/pageFormats'

import { PageSheet } from '@front/_components/editor/PageSheet'
import { RichTextEditor } from '@front/_components/editor/RichTextEditor'
import { saveComposition } from '@front/_features/compositions/actions'
import type { CompositionPatch, LexicalContent } from '@front/_features/compositions/types'
import { useAutosave } from '@front/_hooks/useAutosave'
import { t } from '@front/_lib/i18n'

import styles from './CompositionEditor.module.css'
import { SynonymsPanel } from './SynonymsPanel'

type CompositionEditorProps = {
  id: number
  title: string
  content: LexicalContent | null
  page: PageSettings
}

// Minimal editing screen: frameless title above the sheet, then the sheet
export function CompositionEditor({ id, title, content, page }: CompositionEditorProps) {
  const [currentTitle, setCurrentTitle] = useState(title)
  const save = useCallback((patch: CompositionPatch) => saveComposition(id, patch), [id])
  const { status, queue, flush } = useAutosave(save)

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
              queue({ title: e.target.value })
            }}
            onBlur={() => void flush()}
          />
          {/* Only save failures are reported; everything else happens silently */}
          {status === 'error' && (
            <p className={styles.saveError} role="alert">
              {t('editor.saveError')}
            </p>
          )}
          <PageSheet settings={page}>
            <RichTextEditor
              initialContent={content}
              placeholder={t('editor.placeholder')}
              // editorState.toJSON() always produces a state matching the field's schema
              onChange={(next) => queue({ content: next as LexicalContent })}
            />
          </PageSheet>
        </div>
        <div className={styles.aside}>
          <SynonymsPanel />
        </div>
      </div>
    </div>
  )
}
