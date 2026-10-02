import { notFound, redirect } from 'next/navigation'

import { firstDocument } from '@/lib/binder/tree'

import { getBinder } from '@front/_features/binder/queries'
import { ROUTES } from '@front/_lib/routes'
import { requireUser } from '@front/_lib/server/auth'
import { parseId } from '@front/_lib/validation'

import { OpenDocument } from './_components/document/OpenDocument'

// The composition itself opens its first document; an empty binder invites to create one
export default async function CompositionPage({ params }: PageProps<'/compositions/[id]'>) {
  const { id } = await params
  const compositionId = parseId(id)
  if (compositionId === null) notFound()

  await requireUser(ROUTES.composition(id))
  const binder = await getBinder(compositionId)
  if (!binder) notFound()

  const first = firstDocument(binder.entries)
  if (first) redirect(ROUTES.document(compositionId, first.id))
  // Empty binder: a document created from here opens on the client
  return <OpenDocument initial={null} />
}
