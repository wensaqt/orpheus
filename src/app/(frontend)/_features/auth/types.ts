export type LogInError = 'invalid' | 'locked' | 'unknown'
export type SignUpError = 'mismatch' | 'weak' | 'taken' | 'invalidEmail' | 'unknown'

// What a form needs back after a failed attempt: the reason, and the email to keep
export type AuthFormState<Error extends string> = { error: Error | null; email: string }
export type LogInState = AuthFormState<LogInError>
export type SignUpState = AuthFormState<SignUpError>

export const INITIAL_AUTH_FORM_STATE = { error: null, email: '' } as const
