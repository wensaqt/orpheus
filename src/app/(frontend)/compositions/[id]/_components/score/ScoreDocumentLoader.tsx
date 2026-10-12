'use client'

import { useEffect, useState } from 'react'

import type { Id } from '@/lib/ids'
import { useT } from '@front/_components/i18n/I18nProvider'
import { Button } from '@front/_components/ui/Button/Button'
import { newerDocument } from '@front/_features/binder/documentCache'
import { loadDocument, seedDocument, useDocumentSlot } from '@front/_features/binder/documentStore'
import type { CachedDocument, EditorDocument } from '@front/_features/binder/types'

import { useBinder } from '../binder/state/BinderProvider'
import { ScoreDocument } from './ScoreDocument'
import styles from './ScoreDocument.module.css'

type ScoreLoaderProps = { id: Id; initial?: EditorDocument & Pick<CachedDocument, 'checkedAt'> }

/** Preserve the server check time so stale router snapshots are revalidated. */
function initialScoreSnapshot(initial: ScoreLoaderProps['initial']): CachedDocument | undefined {
  if (initial?.documentType !== 'score') return undefined
  return {
    documentType: 'score',
    content: null,
    scoreXml: initial.scoreXml,
    updatedAt: initial.updatedAt,
    checkedAt: initial.checkedAt,
  }
}

export function ScoreDocumentLoader({ id, initial }: ScoreLoaderProps) {
  const t = useT()
  const { compositionId, entries } = useBinder()
  const slot = useDocumentSlot(id)
  const ready = newerDocument(
    slot?.status === 'ready' ? slot.document : undefined,
    initialScoreSnapshot(initial),
  )
  // Keep the initialized editor mounted even when a later cache check changes the slot status.
  // Its local XML owns unsaved edits; this snapshot only initializes each keyed document mount.
  const [initialSnapshot, setInitialSnapshot] = useState(ready)
  if (!initialSnapshot && ready) setInitialSnapshot(ready)
  const entry = entries.find((item) => item.id === id && item.documentType === 'score')
  const exists = entry !== undefined

  useEffect(() => {
    if (!exists) return
    const snapshot = initialScoreSnapshot(initial)
    if (snapshot) seedDocument(id, snapshot)
    void loadDocument(compositionId, id)
  }, [compositionId, id, initial, exists])

  if (
    !entry ||
    slot?.status === 'missing' ||
    (initialSnapshot && initialSnapshot.documentType !== 'score')
  )
    return <p className={styles.message}>{t('score.documentMissing')}</p>
  if (initialSnapshot?.documentType === 'score')
    return <ScoreDocument id={id} title={entry.title} initialXml={initialSnapshot.scoreXml ?? ''} />
  if (slot?.status === 'error')
    return (
      <div className={styles.message} role="alert">
        <p>{t('editor.loadError')}</p>
        <Button variant="ghost" onClick={() => void loadDocument(compositionId, id)}>
          {t('editor.retry')}
        </Button>
      </div>
    )
  return (
    <p className={styles.message} role="status" aria-busy="true">
      {t('score.loading')}
    </p>
  )
}
