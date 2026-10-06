'use server'

import { cookies } from 'next/headers'

import { COOKIE_MAX_AGE } from '@front/_lib/preferences'
import { isLocale, LOCALE_COOKIE, type Locale } from '@front/_lib/i18n'

/*
 * Remembers the chosen language in a cookie. Setting a cookie in an action makes Next.js
 * render the current page again, now in that language.
 */
export async function setLocale(locale: Locale) {
  if (!isLocale(locale)) return
  ;(await cookies()).set(LOCALE_COOKIE, locale, {
    maxAge: COOKIE_MAX_AGE,
    path: '/',
    sameSite: 'lax',
  })
}
