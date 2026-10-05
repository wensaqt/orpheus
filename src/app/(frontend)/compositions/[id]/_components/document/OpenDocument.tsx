'use client'

import { useEffect, useEffectEvent, useState } from 'react'

import type { Id } from '@/lib/ids'

import { BlankPage } from '@front/_components/editor/pagination/BlankPage'
import { useT } from '@front/_components/i18n/I18nProvider'
import { Button } from '@front/_components/ui/Button/Button'
import {
  type CachedDocument,
  neighbourDocuments,
  newerText,
} from '@front/_features/binder/documentCache'
import {
  loadDocument,
  prefetchDocument,
  seedDocument,
  useDocumentSlot,
} from '@front/_features/binder/documentStore'
import type { EditorDocument } from '@front/_features/binder/types'

import { useBinder } from '../binder/state/BinderProvider'
import { usePageSettings } from '../page/PageSettingsProvider'
import { DocumentEditor } from './DocumentEditor'
import { EmptyBinder } from './EmptyBinder'
import styles from './OpenDocument.module.css'

// A document as the server page rendered it, with when (its last check)
type RenderedDocument = EditorDocument & Pick<CachedDocument, 'checkedAt'>

/*
 * Whatever the editor shows in the middle column: the open document, or the empty binder.
 * The document comes from the client cache; the server page only provides it on a full load
 * (a direct visit, a reload), as `initial`.
 */
export function OpenDocument({ initial }: { initial: RenderedDocument | null }) {
  const { activeDocumentId } = useBinder()
  if (activeDocumentId === null) return <EmptyBinder />
  return (
    <DocumentLoader
      key={activeDocumentId}
      id={activeDocumentId}
      initial={initial?.id === activeDocumentId ? initial : undefined}
    />
  )
}

function DocumentLoader({ id, initial }: { id: Id; initial?: RenderedDocument }) {
  const t = useT()
  const { compositionId, entries } = useBinder()
  const { settings: page } = usePageSettings()
  const slot = useDocumentSlot(id)
  const ready = newerText(slot?.status === 'ready' ? slot.document : undefined, initial)
  // Chosen once: the editor reads its initial state on mount only
  const [start, setStart] = useState(ready)
  if (!start && ready) setStart(ready)

  const entry = entries.find((candidate) => candidate.id === id && candidate.kind === 'document')
  const exists = entry !== undefined
  useEffect(() => {
    // Not in the binder (deleted meanwhile): nothing to load
    if (!exists) return
    if (initial) seedDocument(id, initial)
    // On a miss this is the load; otherwise a check of an older cached version
    void loadDocument(compositionId, id)
  }, [compositionId, id, initial, exists])

  // The documents next to it are likely opened next
  const loadNeighbours = useEffectEvent(() => {
    for (const neighbour of neighbourDocuments(entries, id))
      prefetchDocument(compositionId, neighbour)
  })
  useEffect(() => loadNeighbours(), [id])

  if (start && entry) return <DocumentEditor id={id} title={entry.title} text={start} />
  if (!entry || slot?.status === 'missing') {
    return <p className={styles.message}>{t('editor.documentMissing')}</p>
  }
  if (slot?.status === 'error') {
    return (
      <div className={styles.message} role="alert">
        <p>{t('editor.loadError')}</p>
        <Button variant="ghost" onClick={() => void loadDocument(compositionId, id)}>
          {t('editor.retry')}
        </Button>
      </div>
    )
  }
  // Still loading: an empty sheet, only shown if the wait is noticeable (see the CSS)
  return (
    <div className={styles.placeholder} aria-busy="true">
      <p className="visually-hidden" role="status">
        {t('editor.loading')}
      </p>
      <BlankPage settings={page} />
    </div>
  )
}
