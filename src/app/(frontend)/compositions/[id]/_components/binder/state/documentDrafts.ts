import type { LexicalContent } from '@front/_features/binder/types'

/*
 * The latest text this tab saved for each document, with the server's version stamp. The
 * browser's back and forward buttons restore pages from the router's cache, with the text they
 * had when first loaded; the editor starts from this copy instead when it is newer. It lives
 * for the tab's session (module scope), across compositions, and holds only saved text.
 */
const drafts = new Map<number, { content: LexicalContent; updatedAt: string }>()

export function rememberSaved(id: number, content: LexicalContent, updatedAt: string) {
  drafts.set(id, { content, updatedAt })
}

// The saved text to start from: this tab's copy if it is at least as recent as the server's
export function latestContent(
  id: number,
  server: { content: LexicalContent | null; updatedAt: string },
): LexicalContent | null {
  const draft = drafts.get(id)
  // ISO 8601 timestamps from the same server compare as strings
  return draft && draft.updatedAt >= server.updatedAt ? draft.content : server.content
}

export function forgetDrafts(ids: Iterable<number>) {
  for (const id of ids) drafts.delete(id)
}
