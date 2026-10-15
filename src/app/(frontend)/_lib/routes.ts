import { type Id, isId } from '@/lib/ids'

// Query parameter carrying the page to come back to after signing in
export const RETURN_TO_PARAM = 'redirect'

const withReturnTo = (path: string, returnTo: string) =>
  `${path}?${RETURN_TO_PARAM}=${encodeURIComponent(returnTo)}`

// Sign-in and sign-up pages
export const AUTH_PAGES = { login: '/login', signup: '/signup' }

// Frontend paths, so they are not hard-coded across components
export const ROUTES = {
  home: '/',
  about: '/about',
  compositions: '/compositions',
  betaInvitations: '/beta/invitations',
  composition: (id: Id) => `/compositions/${id}`,
  // A document of the composition's binder, open in the editor
  document: (compositionId: Id, documentId: Id) => `/compositions/${compositionId}/${documentId}`,
  // The editor showing a document, or the composition itself (its empty binder) without one
  editor: (compositionId: Id, documentId: Id | null) =>
    documentId === null
      ? `/compositions/${compositionId}`
      : `/compositions/${compositionId}/${documentId}`,
  // A document's text as JSON, for the editor's client cache (GET, see content/route.ts)
  documentContent: (compositionId: Id, documentId: Id) =>
    `/compositions/${compositionId}/${documentId}/content`,
  // The app's own sign-in and sign-up pages, which then send the user back to returnTo
  login: (returnTo: string) => withReturnTo(AUTH_PAGES.login, returnTo),
  signup: (returnTo: string) => withReturnTo(AUTH_PAGES.signup, returnTo),
}

// The composition and document an editor path shows (no document: the composition itself)
export function editorPath(pathname: string): { compositionId: Id; documentId: Id | null } | null {
  const [, section, compositionId, documentId] = pathname.split('/')
  if (`/${section}` !== ROUTES.compositions || !isId(compositionId)) return null
  return { compositionId, documentId: isId(documentId) ? documentId : null }
}

// The document a path of this composition's editor shows, or null (the composition itself)
export function documentIdFromPath(pathname: string, compositionId: Id): Id | null {
  const path = editorPath(pathname)
  return path?.compositionId === compositionId ? path.documentId : null
}
