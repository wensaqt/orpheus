'use client'

import React, { useCallback, useState } from 'react'

import type { PageSettings } from '@/lib/pageFormats'

import { PageSheet } from '@front/_components/editor/PageSheet'
import { RichTextEditor } from '@front/_components/editor/RichTextEditor'
import { BackLink } from '@front/_components/ui/BackLink/BackLink'
import { saveComposition } from '@front/_features/compositions/actions'
import type { CompositionPatch, LexicalContent } from '@front/_features/compositions/types'
import { useAutosave } from '@front/_hooks/useAutosave'
import { t } from '@front/_lib/i18n'
import { ROUTES } from '@front/_lib/routes'

import styles from './CompositionEditor.module.css'

type CompositionEditorProps = {
  id: number
  title: string
  content: LexicalContent | null
  page: PageSettings
}

// Écran d'édition épuré : retour discret, titre sans cadre au-dessus de la feuille, puis la feuille
export function CompositionEditor({ id, title, content, page }: CompositionEditorProps) {
  const [currentTitle, setCurrentTitle] = useState(title)
  const save = useCallback((patch: CompositionPatch) => saveComposition(id, patch), [id])
  const { status, queue, flush } = useAutosave(save)

  return (
    <div className={styles.screen}>
      <BackLink href={ROUTES.compositions} label={t('editor.back')} onClick={() => void flush()} />
      <div className={styles.desk}>
        {/* La colonne prend la largeur de la feuille, le titre s'y aligne */}
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
          {/* Seul l'échec d'enregistrement est signalé ; le reste se fait en silence */}
          {status === 'error' && (
            <p className={styles.saveError} role="alert">
              {t('editor.saveError')}
            </p>
          )}
          <PageSheet settings={page}>
            <RichTextEditor
              initialContent={content}
              placeholder={t('editor.placeholder')}
              onChange={(next) => queue({ content: next })}
            />
          </PageSheet>
        </div>
      </div>
    </div>
  )
}
