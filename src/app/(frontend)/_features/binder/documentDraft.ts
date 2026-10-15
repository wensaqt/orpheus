import { isLexicalContent } from '@/lib/lexical'
import type { LexicalContent } from './types'

export type DocumentDraft = { content: LexicalContent; revision: string }
const PREFIX = 'orpheus-draft:'
const keyFor = (owner: string, document: string) => `${PREFIX}${owner}:${document}`

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
    const draft = JSON.parse(stored)
    return isLexicalContent(draft.content) && /^[a-f0-9]{64}$/.test(draft.revision) ? draft : null
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
