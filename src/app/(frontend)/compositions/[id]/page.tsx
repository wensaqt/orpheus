import { notFound } from 'next/navigation'

import { getCompositionForEditor } from '@front/_features/compositions/queries'
import { ROUTES } from '@front/_lib/routes'
import { requireUser } from '@front/_lib/server/session'

import { CompositionEditor } from './_components/CompositionEditor'

export default async function CompositionPage({ params }: PageProps<'/compositions/[id]'>) {
  const { id } = await params
  const compositionId = Number(id)
  if (!Number.isInteger(compositionId)) notFound()

  const session = await requireUser(ROUTES.composition(id))
  // Not found or owned by someone else: same response, so nothing is disclosed
  const composition = await getCompositionForEditor(session, compositionId)
  if (!composition) notFound()

  return <CompositionEditor {...composition} />
}
