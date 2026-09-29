'use client'

import Link from 'next/link'
import React, { useCallback, useState } from 'react'

import type { PageSettings } from '@/lib/pageFormats'

import { ROUTES } from '../../_lib/routes'
import { type CompositionPatch, saveComposition } from '../../compositions/actions'
import styles from './CompositionEditor.module.css'
import { PageSheet } from './PageSheet'
import { RichTextEditor } from './RichTextEditor'
import { type SaveStatus, useAutosave } from './useAutosave'

const COPY = {
  back: 'Orpheus',
  titleLabel: 'Composition title',
  placeholder: 'Start writing…',
  status: {
    saved: 'Saved',
    pending: 'Unsaved changes',
    saving: 'Saving…',
    error: 'Could not save — retrying on next change',
  } satisfies Record<SaveStatus, string>,
}

type CompositionEditorProps = {
  id: number
  title: string
  content: Record<string, unknown> | null
  page: PageSettings
}

// Écran d'édition : barre du haut (retour, titre, état) et feuille de papier
export function CompositionEditor({ id, title, content, page }: CompositionEditorProps) {
  const [currentTitle, setCurrentTitle] = useState(title)
  const save = useCallback((patch: CompositionPatch) => saveComposition(id, patch), [id])
  const { status, queue, flush } = useAutosave(save)

  return (
    <div className={styles.screen}>
      <header className={styles.bar}>
        <Link href={ROUTES.compositions} className={styles.back} onClick={() => void flush()}>
          {COPY.back}
        </Link>
        <input
          className={styles.title}
          aria-label={COPY.titleLabel}
          value={currentTitle}
          onChange={(e) => {
            setCurrentTitle(e.target.value)
            queue({ title: e.target.value })
          }}
          onBlur={() => void flush()}
        />
        <span className={styles.status} data-status={status} role="status">
          {COPY.status[status]}
        </span>
      </header>
      <div className={styles.desk}>
        <PageSheet settings={page}>
          <RichTextEditor
            initialContent={content}
            placeholder={COPY.placeholder}
            onChange={(next) => queue({ content: next })}
          />
        </PageSheet>
      </div>
    </div>
  )
}
