import { notFound } from 'next/navigation'

import { getDocument } from '@front/_features/binder/queries'
import { ROUTES } from '@front/_lib/routes'
import { requireUser } from '@front/_lib/server/auth'
import { parseId } from '@front/_lib/validation'

import { OpenDocument } from '../_components/document/OpenDocument'

export default async function DocumentPage({
  params,
}: PageProps<'/compositions/[id]/[documentId]'>) {
  const { id, documentId } = await params
  const compositionId = parseId(id)
  const itemId = parseId(documentId)
  if (compositionId === null || itemId === null) notFound()

  await requireUser(ROUTES.document(id, documentId))
  // Missing, a folder, someone else's or from another composition: all the same 404
  const document = await getDocument(compositionId, itemId)
  if (!document) notFound()

  // The entry point of a full load; switching documents afterwards stays on the client
  return <OpenDocument initial={document} />
}
