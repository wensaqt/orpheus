import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'

import { toLayout } from '@/lib/layout'

import { getBinder } from '@front/_features/binder/queries'
import { BINDER_HIDDEN_COOKIE, isPreferenceOn } from '@front/_lib/preferences'
import { parseId } from '@front/_lib/validation'

import { EditorShell } from './_components/EditorShell'

/*
 * The editor around every document of a composition: binder on the left, synonyms on the
 * right. As a layout it stays mounted while the writer goes from one document to another.
 */
export default async function CompositionLayout({
  params,
  children,
}: LayoutProps<'/compositions/[id]'>) {
  const { id } = await params
  const compositionId = parseId(id)
  if (compositionId === null) notFound()

  /*
   * No session, not found or someone else's: the layout adds nothing and the page below
   * decides (login redirect or 404). Layouts never check auth: they render in parallel with
   * pages, which would race to redirect.
   */
  const binder = await getBinder(compositionId)
  if (!binder) return children

  return (
    <EditorShell
      compositionId={binder.composition.id}
      title={binder.composition.title}
      layout={toLayout(binder.composition)}
      entries={binder.entries}
      binderHidden={isPreferenceOn((await cookies()).get(BINDER_HIDDEN_COOKIE)?.value)}
    >
      {children}
    </EditorShell>
  )
}
