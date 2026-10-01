'use client'

import { useActionState, useId } from 'react'

import { logIn } from '@front/_features/auth/actions'
import { INITIAL_AUTH_FORM_STATE, type LogInState } from '@front/_features/auth/types'
import { t } from '@front/_lib/i18n'

import { AuthField } from '../../_components/AuthField'
import { AuthSheet } from '../../_components/AuthSheet'

export function LoginForm({ returnTo }: { returnTo: string }) {
  const [state, action, pending] = useActionState<LogInState, FormData>(
    logIn,
    INITIAL_AUTH_FORM_STATE,
  )
  const errorId = useId()
  // Wrong credentials concern both fields
  const describedBy = state.error ? errorId : undefined

  return (
    <AuthSheet
      heading={t('auth.login.heading')}
      subtitle={t('auth.login.subtitle')}
      action={action}
      returnTo={returnTo}
      error={state.error && t(`auth.login.errors.${state.error}`)}
      errorId={errorId}
      submitLabel={t('auth.login.submit')}
      pendingLabel={t('auth.login.submitting')}
      pending={pending}
    >
      <AuthField
        label={t('auth.fields.email')}
        type="email"
        name="email"
        autoComplete="email"
        required
        defaultValue={state.email}
        errorId={describedBy}
      />
      <AuthField
        label={t('auth.fields.password')}
        type="password"
        name="password"
        autoComplete="current-password"
        required
        errorId={describedBy}
      />
    </AuthSheet>
  )
}
