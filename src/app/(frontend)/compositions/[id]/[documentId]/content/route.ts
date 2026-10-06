import { findDocument } from '@front/_features/binder/queries'
import { HTTP_STATUS } from '@front/_lib/http'
import { getSession } from '@front/_lib/server/auth'
import { parseId } from '@front/_lib/validation'

/*
 * A document's text as JSON, for the editor's client cache: switching documents then needs no
 * page render. A GET route rather than a server action, because Next.js runs actions one at a
 * time per client: loads ahead of time would queue behind (and delay) the autosaves. Same
 * checks as the page: signed-in user, access control on, a document of this composition.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<'/compositions/[id]/[documentId]/content'>,
) {
  const { id, documentId } = await params
  const compositionId = parseId(id)
  const itemId = parseId(documentId)
  if (compositionId === null || itemId === null) return notFound()

  const { payload, user } = await getSession()
  if (!user) return Response.json(null, { status: HTTP_STATUS.unauthorized })
  const document = await findDocument({ payload, user }, compositionId, itemId)
  if (!document) return notFound()
  // Private writing: never kept by a shared cache, and always asked for fresh
  return Response.json(document, { headers: { 'Cache-Control': 'private, no-store' } })
}

const notFound = () => Response.json(null, { status: HTTP_STATUS.notFound })
