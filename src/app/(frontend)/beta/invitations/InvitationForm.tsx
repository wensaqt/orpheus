'use client'

import { useActionState, useState } from 'react'
import { MAX_EMAIL_LENGTH } from '@/lib/users'
import { AuthField } from '@front/(auth)/_components/AuthField'
import { Button } from '@front/_components/ui/Button/Button'
import { useT } from '@front/_components/i18n/I18nProvider'
import { issueInvitation } from './actions'
import { INITIAL_INVITATION_STATE } from './types'
import styles from './page.module.css'

export function InvitationForm() {
  const t = useT()
  const [state, action, pending] = useActionState(issueInvitation, INITIAL_INVITATION_STATE)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle')
  async function copyInvitation() {
    if (!state.url) return
    try {
      await navigator.clipboard.writeText(state.url)
      setCopyStatus('copied')
    } catch {
      setCopyStatus('failed')
    }
  }
  return (
    <>
      <form action={action} onSubmit={() => setCopyStatus('idle')} className={styles.form}>
        <AuthField
          label={t('auth.fields.email')}
          type="email"
          name="email"
          maxLength={MAX_EMAIL_LENGTH}
          required
          defaultValue={state.email}
        />
        {state.error && <p role="alert">{t(`betaInvitations.errors.${state.error}`)}</p>}
        <Button type="submit" disabled={pending}>
          {t(pending ? 'betaInvitations.generating' : 'betaInvitations.generate')}
        </Button>
      </form>
      {state.url && !pending && (
        <div className={styles.result}>
          <label htmlFor="invitation-link">{t('betaInvitations.link')}</label>
          <textarea
            id="invitation-link"
            rows={3}
            readOnly
            value={state.url}
            onFocus={(event) => event.currentTarget.select()}
          />
          <Button onClick={() => void copyInvitation()}>{t('betaInvitations.copy')}</Button>
          <p role="status">
            {t(
              copyStatus === 'copied'
                ? 'betaInvitations.copied'
                : copyStatus === 'failed'
                  ? 'betaInvitations.copyFailed'
                  : 'betaInvitations.delivery',
            )}
          </p>
        </div>
      )}
    </>
  )
}
