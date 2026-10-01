'use client'

import { useActionState, useId } from 'react'

import { MIN_PASSWORD_LENGTH } from '@/lib/users'

import { signUp } from '@front/_features/auth/actions'
import {
  INITIAL_AUTH_FORM_STATE,
  type SignUpError,
  type SignUpState,
} from '@front/_features/auth/types'
import { t } from '@front/_lib/i18n'

import { AuthField } from '../../_components/AuthField'
import { AuthSheet } from '../../_components/AuthSheet'

// The fields each error is about
const EMAIL_ERRORS: SignUpError[] = ['taken', 'invalidEmail']
const PASSWORD_ERRORS: SignUpError[] = ['weak', 'mismatch']

export function SignupForm({ returnTo }: { returnTo: string }) {
  const [state, action, pending] = useActionState<SignUpState, FormData>(
    signUp,
    INITIAL_AUTH_FORM_STATE,
  )
  const errorId = useId()
  const on = (errors: SignUpError[]) =>
    state.error && errors.includes(state.error) ? errorId : undefined
  const min = { min: MIN_PASSWORD_LENGTH }

  return (
    <AuthSheet
      heading={t('auth.signup.heading')}
      subtitle={t('auth.signup.subtitle')}
      action={action}
      returnTo={returnTo}
      error={state.error && t(`auth.signup.errors.${state.error}`, min)}
      errorId={errorId}
      submitLabel={t('auth.signup.submit')}
      pendingLabel={t('auth.signup.submitting')}
      pending={pending}
    >
      <AuthField
        label={t('auth.fields.email')}
        type="email"
        name="email"
        autoComplete="email"
        required
        defaultValue={state.email}
        errorId={on(EMAIL_ERRORS)}
      />
      <AuthField
        label={t('auth.fields.password')}
        hint={t('auth.fields.passwordHint', min)}
        type="password"
        name="password"
        autoComplete="new-password"
        required
        errorId={on(PASSWORD_ERRORS)}
      />
      <AuthField
        label={t('auth.fields.confirmPassword')}
        type="password"
        name="confirm"
        autoComplete="new-password"
        required
        errorId={on(['mismatch'])}
      />
    </AuthSheet>
  )
}
