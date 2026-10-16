'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useT } from '@front/_components/i18n/I18nProvider'
import { Button } from '@front/_components/ui/Button/Button'
import { useConfirm } from '@front/_components/ui/Feedback/ConfirmProvider'
import type { ActionFailure } from '@front/_lib/actionResult'
import { ROUTES } from '@front/_lib/routes'
import styles from './ScoreDocument.module.css'

type Props = {
  reason: ActionFailure['reason']
  onDownload: () => void
  onRetry: () => Promise<void>
  onDiscard: () => void
}

export function ScoreSaveAlert({ reason, onDownload, onRetry, onDiscard }: Props) {
  const t = useT()
  const pathname = usePathname()
  const confirm = useConfirm()
  const message =
    reason === 'session-expired'
      ? 'score.sessionExpired'
      : reason === 'conflict'
        ? 'score.saveConflict'
        : 'editor.saveError'

  async function loadSavedVersion() {
    if (await confirm({ title: t('score.discardChanges'), tone: 'danger' })) onDiscard()
  }

  return (
    <div className={styles.error} role="alert">
      <p>{t(message)}</p>
      <Button variant="ghost" onClick={onDownload}>
        {t('editor.downloadDraft')}
      </Button>
      {reason === 'session-expired' && (
        <>
          <Link href={ROUTES.login(pathname)} target="_blank" rel="noopener noreferrer">
            {t('score.logInNewTab')}
          </Link>
          <Button variant="ghost" onClick={() => void onRetry()}>
            {t('score.retrySave')}
          </Button>
        </>
      )}
      {reason === 'conflict' && (
        <Button variant="ghost" onClick={() => void loadSavedVersion()}>
          {t('editor.loadSavedVersion')}
        </Button>
      )}
    </div>
  )
}
