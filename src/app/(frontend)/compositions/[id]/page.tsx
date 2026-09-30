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
  // Introuvable ou appartenant à quelqu'un d'autre : même réponse, pour ne rien divulguer
  const composition = await getCompositionForEditor(session, compositionId)
  if (!composition) notFound()

  return <CompositionEditor {...composition} />
}
