'use client'

import { createPortal } from 'react-dom'

import type { Id } from '@/lib/ids'
import { useT } from '@front/_components/i18n/I18nProvider'
import { ScoreRenderer } from '@front/_components/scores/ScoreRenderer'
import { TitleInput } from '@front/_components/ui/TitleInput/TitleInput'

import { useDocumentTitleSlot } from '../header/documentTitleSlot'
import { ScorePanel } from './ScorePanel'
import { ScoreSaveAlert } from './ScoreSaveAlert'
import { useScoreDocument } from './useScoreDocument'
import styles from './ScoreDocument.module.css'

type ScoreView = ReturnType<typeof useScoreDocument>

function ScoreTitlePortal({ titleField, busy }: Pick<ScoreView, 'titleField' | 'busy'>) {
  const t = useT()
  const titleSlot = useDocumentTitleSlot()
  if (!titleSlot) return null
  return createPortal(
    <TitleInput
      size="lg"
      aria-label={t('editor.documentTitleLabel')}
      disabled={busy}
      {...titleField.inputProps}
    />,
    titleSlot,
  )
}

function ScoreMessages({
  hasSaveError,
  saveRecovery,
  error,
}: Pick<ScoreView, 'hasSaveError' | 'saveRecovery' | 'error'>) {
  return (
    <>
      {hasSaveError && <ScoreSaveAlert {...saveRecovery} />}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </>
  )
}

export function ScoreDocument(props: { id: Id; title: string; initialXml: string }) {
  const t = useT()
  const {
    onKeyDown,
    titleField,
    busy,
    fileInput,
    importFile,
    isImporting,
    hasSaveError,
    saveRecovery,
    error,
    panelProps,
    sheetRef,
    rendererProps,
  } = useScoreDocument(props)
  return (
    <div className={styles.workspace} onKeyDown={onKeyDown}>
      <ScoreTitlePortal titleField={titleField} busy={busy} />
      <input
        ref={fileInput}
        className="visually-hidden"
        type="file"
        aria-label={t('score.importMusicXml')}
        accept=".musicxml,.xml"
        onChange={(event) => void importFile(event)}
      />
      <ScoreMessages hasSaveError={hasSaveError} saveRecovery={saveRecovery} error={error} />
      {isImporting && (
        <p role="status" aria-live="polite" className={styles.message}>
          {t('score.importing')}
        </p>
      )}
      <ScorePanel {...panelProps} />
      <div ref={sheetRef} className={styles.sheet}>
        <ScoreRenderer {...rendererProps} className={styles.score} />
      </div>
    </div>
  )
}
