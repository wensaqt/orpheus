import type { Id } from '@/lib/ids'

// Preference lifetime in seconds: one year
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

/*
 * Display preferences kept in cookies, so the server renders the page as the writer left it
 * (no jump after loading). Set from the browser; read by layouts with cookies().
 */
export const BINDER_HIDDEN_COOKIE = 'orpheus-binder-hidden'
export const RULER_HIDDEN_COOKIE = 'orpheus-ruler-hidden'
export const SYNONYMS_HIDDEN_COOKIE = 'orpheus-synonyms-hidden'

// How a preference cookie spells on and off
const ON = '1'
const OFF = '0'

export function setPreferenceCookie(name: string, value: boolean) {
  document.cookie = `${name}=${value ? ON : OFF}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`
}

export const isPreferenceOn = (value: string | undefined) => value === ON

// Per-browser preferences that the server does not need, kept in localStorage
export const STORAGE_KEYS = {
  // The folders the writer collapsed in a composition's binder
  collapsedFolders: (compositionId: Id) => `orpheus:binder:${compositionId}:collapsed`,
}
