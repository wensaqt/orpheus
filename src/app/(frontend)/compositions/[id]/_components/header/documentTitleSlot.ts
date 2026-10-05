'use client'

import { createContext, use } from 'react'

/*
 * Where the open document's title goes in the editor's header. The title stays in the
 * document's editor (it hands the caret to the text and back), which renders it there
 * through a portal.
 */
export const DocumentTitleSlot = createContext<HTMLElement | null>(null)

export const useDocumentTitleSlot = () => use(DocumentTitleSlot)
