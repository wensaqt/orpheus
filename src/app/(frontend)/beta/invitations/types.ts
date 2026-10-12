export type InvitationState = {
  email: string
  url: string | null
  error: 'invalidEmail' | 'taken' | 'forbidden' | 'unavailable' | null
}
export const INITIAL_INVITATION_STATE: InvitationState = { email: '', url: null, error: null }
