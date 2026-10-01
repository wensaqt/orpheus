import 'server-only'

import { redirect } from 'next/navigation'

import { safeReturnTo } from '@front/_lib/returnTo'
import { RETURN_TO_PARAM } from '@front/_lib/routes'
import { getSession } from '@front/_lib/server/auth'

type SearchParams = Record<string, string | string[] | undefined>

/*
 * For pages meant for visitors (sign-in, sign-up): the page to go back to afterwards. Someone
 * already signed in has nothing to do here and is sent straight there.
 */
export async function guestReturnTo(searchParams: Promise<SearchParams>): Promise<string> {
  const returnTo = safeReturnTo((await searchParams)[RETURN_TO_PARAM])
  const { user } = await getSession()
  if (user) redirect(returnTo)
  return returnTo
}
