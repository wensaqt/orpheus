import type { Id } from '@/lib/ids'

/*
 * Display preferences kept in cookies, so the server renders the page as the writer left it
 * (no jump after loading). Set from the browser; read by layouts with cookies().
 */
export const BINDER_HIDDEN_COOKIE = 'orpheus-binder-hidden'
export const SYNONYMS_HIDDEN_COOKIE = 'orpheus-synonyms-hidden'

const ONE_YEAR = 60 * 60 * 24 * 365

export function setPreferenceCookie(name: string, value: boolean) {
  document.cookie = `${name}=${value ? '1' : '0'}; path=/; max-age=${ONE_YEAR}; samesite=lax`
}

export const isPreferenceOn = (value: string | undefined) => value === '1'

// Per-browser preferences that the server does not need, kept in localStorage
export const STORAGE_KEYS = {
  // The folders the writer collapsed in a composition's binder
  collapsedFolders: (compositionId: Id) => `orpheus:binder:${compositionId}:collapsed`,
}
