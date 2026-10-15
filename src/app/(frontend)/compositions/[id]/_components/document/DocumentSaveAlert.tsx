'use client'

import { $getRoot, type LexicalEditor } from 'lexical'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Id } from '@/lib/ids'
import { useT } from '@front/_components/i18n/I18nProvider'
import { Button } from '@front/_components/ui/Button/Button'
import { useConfirm } from '@front/_components/ui/Feedback/ConfirmProvider'
import { removeDraft } from '@front/_features/binder/documentDraft'
import type { ActionFailure } from '@front/_lib/actionResult'
import { ROUTES } from '@front/_lib/routes'
import styles from './DocumentEditor.module.css'

function downloadDraft(editor: LexicalEditor, title: string) {
  const text = editor.getEditorState().read(() => $getRoot().getTextContent())
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${title}.txt`
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

type Props = {
  settingsOnly?: boolean
  reason: ActionFailure['reason']
  editor: LexicalEditor
  title: string
  ownerId: Id
  id: Id
  cancel: () => void
}

function saveAlertMessage(reason: Props['reason'], settingsOnly: Props['settingsOnly']) {
  if (reason === 'session-expired')
    return settingsOnly ? 'editor.sessionExpiredSettings' : 'editor.sessionExpired'
  return reason === 'conflict' ? 'editor.saveConflict' : 'editor.saveError'
}

export function DocumentSaveAlert({
  reason,
  settingsOnly,
  editor,
  title,
  ownerId,
  id,
  cancel,
}: Props) {
  const t = useT()
  const pathname = usePathname()
  const confirm = useConfirm()
  const message = saveAlertMessage(reason, settingsOnly)
  async function loadSavedVersion() {
    if (!(await confirm({ title: t('editor.discardDraft'), tone: 'danger' }))) return
    cancel()
    removeDraft(ownerId, id)
    window.location.reload()
  }
  return (
    <div className={styles.saveError} role="alert">
      <p>{t(message)}</p>
      {reason === 'session-expired' && (
        <Link data-reconnect href={ROUTES.login(pathname)}>
          {t('account.logIn')}
        </Link>
      )}
      <Button variant="ghost" onClick={() => downloadDraft(editor, title)}>
        {t('editor.downloadDraft')}
      </Button>
      {reason === 'conflict' && (
        <Button variant="ghost" onClick={() => void loadSavedVersion()}>
          {t('editor.loadSavedVersion')}
        </Button>
      )}
    </div>
  )
}
