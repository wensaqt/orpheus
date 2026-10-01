/*
 * Two independent axes: the role is what someone may do (admin panel), the plan is what they pay
 * for. An admin can be on either plan, and a lapsed subscription changes the plan, never the role.
 */
export const USER_ROLES = ['admin', 'user'] as const
export type UserRole = (typeof USER_ROLES)[number]
export const DEFAULT_USER_ROLE: UserRole = 'user'

export const PLANS = ['free', 'pro'] as const
export type Plan = (typeof PLANS)[number]
export const DEFAULT_PLAN: Plan = 'free'

type Account = { role?: UserRole | null; plan?: Plan | null } | null | undefined

export const isAdmin = (user: Account) => user?.role === 'admin'

export const isPro = (user: Account) => user?.plan === 'pro'

// Checked by the collection for every email and password set, whoever sets them
export const MIN_PASSWORD_LENGTH = 8
// Long enough for any passphrase, short enough that nobody can make the server hash megabytes
export const MAX_PASSWORD_LENGTH = 128
// The longest address the email standards allow
export const MAX_EMAIL_LENGTH = 254
