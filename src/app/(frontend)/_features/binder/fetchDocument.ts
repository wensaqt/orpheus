import type { Id } from '@/lib/ids'
import { isRecord } from '@/lib/guards'
import { isLexicalContent } from '@/lib/lexical'

import { HTTP_STATUS } from '@front/_lib/http'
import { ROUTES } from '@front/_lib/routes'

import type { EditorDocument } from './types'

// The document, or null when the server says it is not there (or not the user's)
export async function fetchDocument(compositionId: Id, id: Id): Promise<EditorDocument | null> {
  const response = await fetch(ROUTES.documentContent(compositionId, id), {
    cache: 'no-store',
    // Without a session, the proxy redirects to the login page: seen here, not followed
    redirect: 'manual',
  })
  if (response.type === 'opaqueredirect' || response.status === HTTP_STATUS.unauthorized) {
    // The session is gone: nothing can load until the writer signs in again
    window.location.assign(ROUTES.login(window.location.pathname))
    return new Promise<never>(() => {})
  }
  if (response.status === HTTP_STATUS.notFound) return null
  if (!response.ok) throw new Error(`Document ${id}: HTTP ${response.status}`)
  const document: unknown = await response.json()
  if (
    !isRecord(document) ||
    document.id !== id ||
    typeof document.title !== 'string' ||
    typeof document.updatedAt !== 'string' ||
    (document.content !== null && !isLexicalContent(document.content))
  ) {
    throw new Error(`Document ${id}: invalid response`)
  }
  return { id, title: document.title, content: document.content, updatedAt: document.updatedAt }
}
