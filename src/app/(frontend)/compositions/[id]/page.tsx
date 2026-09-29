import { notFound } from 'next/navigation'

import { toPageSettings } from '@/lib/pageFormats'

import { CompositionEditor } from '../../_components/editor/CompositionEditor'
import { ROUTES } from '../../_lib/routes'
import { requireUser } from '../../_lib/session'

export default async function CompositionPage({ params }: PageProps<'/compositions/[id]'>) {
  const { id } = await params
  const compositionId = Number(id)
  if (!Number.isInteger(compositionId)) notFound()

  const { payload, user } = await requireUser(ROUTES.composition(id))
  // Introuvable ou appartenant à quelqu'un d'autre : même réponse, pour ne rien divulguer
  const composition = await payload
    .findByID({
      collection: 'compositions',
      id: compositionId,
      user,
      overrideAccess: false,
      depth: 0,
    })
    .catch(() => null)
  if (!composition) notFound()

  const content =
    composition.content &&
    typeof composition.content === 'object' &&
    !Array.isArray(composition.content)
      ? composition.content
      : null

  return (
    <CompositionEditor
      id={composition.id}
      title={composition.title}
      content={content}
      page={toPageSettings(composition.page)}
    />
  )
}
