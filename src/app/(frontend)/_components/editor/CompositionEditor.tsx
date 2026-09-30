'use client'

import React, { useCallback, useState } from 'react'

import type { PageSettings } from '@/lib/pageFormats'

import { t } from '../../_lib/i18n'
import { ROUTES } from '../../_lib/routes'
import { type CompositionPatch, saveComposition } from '../../compositions/actions'
import { BackLink } from '../ui/BackLink/BackLink'
import styles from './CompositionEditor.module.css'
import { PageSheet } from './PageSheet'
import { RichTextEditor } from './RichTextEditor'
import { useAutosave } from './useAutosave'

type CompositionEditorProps = {
  id: number
  title: string
  content: Record<string, unknown> | null
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
