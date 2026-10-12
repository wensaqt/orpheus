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

//TODO: this file seems odd, we should challenge the way we load scores, maybe add a context or something; this feels globally overengineered
export function ScoreDocumentLoader({ id, initial }: ScoreLoaderProps) {
  const t = useT()
  const { compositionId, entries } = useBinder()
  const slot = useDocumentSlot(id)
  //TODO: add enum for slot status
  const ready = newerDocument(
    slot?.status === 'ready' ? slot.document : undefined,
    initial?.documentType === 'score'
      ? {
          documentType: 'score',
          content: null,
          scoreXml: initial.scoreXml,
          updatedAt: initial.updatedAt,
          checkedAt: initial.checkedAt,
        }
      : undefined,
  )
  // Choose once per keyed document mount; later checks must not replace unsaved edits.
  // TODO: challenge this state, why a start state ?
  const [start, setStart] = useState(ready)
  if (!start && ready) setStart(ready)
  const entry = entries.find((item) => item.id === id && item.documentType === 'score')
  const exists = entry !== undefined

  useEffect(() => {
    if (!exists) return
    if (initial?.documentType === 'score')
      seedDocument(id, {
        documentType: 'score',
        content: null,
        scoreXml: initial.scoreXml,
        updatedAt: initial.updatedAt,
        checkedAt: initial.checkedAt,
      })
    void loadDocument(compositionId, id)
  }, [compositionId, id, initial, exists])

  if (!entry || slot?.status === 'missing' || (start && start.documentType !== 'score'))
    return <p className={styles.message}>{t('score.documentMissing')}</p>
  if (start?.documentType === 'score')
    return <ScoreDocument id={id} title={entry.title} initialXml={start.scoreXml ?? ''} />
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
