import { isLexicalContent } from '@/lib/lexical'
import { isContentRevision } from '@/lib/contentRevision'
import { isRecord } from '@/lib/guards'
import type { LexicalContent } from './types'

export type DocumentDraft = { content: LexicalContent; revision: string }
const PREFIX = 'orpheus-draft:'
const keyFor = (owner: string, document: string) => `${PREFIX}${owner}:${document}`

function isDocumentDraft(value: unknown): value is DocumentDraft {
  return isRecord(value) && isLexicalContent(value.content) && isContentRevision(value.revision)
}

// sessionStorage survives navigation/reload in this tab, but never crosses account boundaries.
// Storage may be unavailable or full; callers must keep the live editor and report this failure.
export function writeDraft(owner: string, document: string, draft: DocumentDraft): boolean {
  try {
    sessionStorage.setItem(keyFor(owner, document), JSON.stringify(draft))
    return true
  } catch {
    return false
  }
}

export function readDraft(owner: string, document: string): DocumentDraft | null {
  try {
    const stored = sessionStorage.getItem(keyFor(owner, document))
    if (!stored) return null
    const draft: unknown = JSON.parse(stored)
    return isDocumentDraft(draft) ? draft : null
  } catch {
    return null
  }
}

export function removeDraft(owner: string, document: string): void {
  try {
    sessionStorage.removeItem(keyFor(owner, document))
  } catch (error) {
    console.warn('Could not remove a confirmed document draft', error)
  }
}
