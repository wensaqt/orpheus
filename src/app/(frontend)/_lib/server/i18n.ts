import 'server-only'

import { cookies, headers } from 'next/headers'
import { cache } from 'react'

import { createT, LOCALE_COOKIE, negotiateLocale } from '../i18n'

// Language of the current request, memoised like the session
export const getLocale = cache(async () =>
  negotiateLocale(
    (await cookies()).get(LOCALE_COOKIE)?.value,
    (await headers()).get('accept-language'),
  ),
)

// Translator for server components, actions and metadata
export const getT = cache(async () => createT(await getLocale()))
