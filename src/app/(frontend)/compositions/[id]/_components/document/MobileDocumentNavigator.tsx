'use client'

import { useState } from 'react'

import { inReadingOrder } from '@/lib/binder/tree'

import { IconButton } from '@front/_components/ui/IconButton/IconButton'
import { useT } from '@front/_components/i18n/I18nProvider'
import { useBinder } from '@front/compositions/[id]/_components/binder/state/BinderProvider'
import { useHistoryState } from '@front/compositions/[id]/_components/history/HistoryProvider'
import { ChevronIcon } from '@front/compositions/[id]/_components/icons'
import styles from './MobileDocumentNavigator.module.css'

type MobileDocumentNavigatorProps = {
  onOpenBinder: () => void
}

export function MobileDocumentNavigator({ onOpenBinder }: MobileDocumentNavigatorProps) {
  const t = useT()
  const { entries, activeDocumentId, commands } = useBinder()
  const { busy } = useHistoryState()
  const [navigating, setNavigating] = useState(false)

  const documents = inReadingOrder(entries).filter((entry) => entry.kind === 'document')
  const currentIndex = documents.findIndex((entry) => entry.id === activeDocumentId)
  const currentDocument = currentIndex < 0 ? undefined : documents[currentIndex]
  const navigationBusy = busy || navigating

  async function openDocument(id: (typeof documents)[number]['id']) {
    setNavigating(true)
    try {
      await commands.open(id)
    } finally {
      setNavigating(false)
    }
  }

  return (
    <nav data-mobile-document-navigator="" className={styles.bar} aria-label={t('binder.label')}>
      <IconButton
        label={t('binder.previousDocument')}
        disabled={navigationBusy || currentIndex <= 0}
        icon={
          <span className={styles.previousIcon}>
            <ChevronIcon />
          </span>
        }
        onClick={() => {
          const previous = documents[currentIndex - 1]
          if (previous) void openDocument(previous.id)
        }}
      />
      <button
        type="button"
        className={styles.title}
        aria-label={
          currentDocument
            ? t('binder.openCurrentDocument', { title: currentDocument.title })
            : t('binder.show')
        }
        onClick={onOpenBinder}
      >
        {currentDocument ? currentDocument.title : t('binder.label')}
      </button>
      <IconButton
        label={t('binder.nextDocument')}
        disabled={navigationBusy || currentIndex < 0 || currentIndex >= documents.length - 1}
        icon={<ChevronIcon />}
        onClick={() => {
          const next = documents[currentIndex + 1]
          if (next) void openDocument(next.id)
        }}
      />
    </nav>
  )
}
