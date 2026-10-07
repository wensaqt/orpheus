'use client'

import { createContext, type ReactNode, use, useState } from 'react'
import {
  RULER_HIDDEN_COOKIE,
  SYNONYMS_HIDDEN_COOKIE,
  setPreferenceCookie,
} from '@front/_lib/preferences'
import { useOpenEditor } from './editorFocus'

type EditorView = {
  rulerVisible: boolean
  toggleRuler: () => void
  synonymsVisible: boolean
  synonymsOver: boolean
  setRoom: (room: boolean) => void
  showSynonyms: () => void
  hideSynonyms: () => void
  toggleSynonyms: () => void
}
const ViewContext = createContext<EditorView | null>(null)

// One display state for the menu and the desk; opening a drawer does not change the wide-screen preference.
export function EditorViewProvider({
  rulerHidden,
  synonymsHidden,
  children,
}: {
  rulerHidden: boolean
  synonymsHidden: boolean
  children: ReactNode
}) {
  const editor = useOpenEditor()
  const [rulerVisible, setRulerVisible] = useState(!rulerHidden)
  const [folded, setFolded] = useState(synonymsHidden)
  const [over, setOver] = useState(false)
  const [room, setRoom] = useState(true)
  const synonymsVisible = room ? !folded : over
  const showSynonyms = () => {
    if (room) {
      setFolded(false)
      setPreferenceCookie(SYNONYMS_HIDDEN_COOKIE, false)
    } else setOver(true)
  }
  const hideSynonyms = () => {
    setOver(false)
    if (room) {
      setFolded(true)
      setPreferenceCookie(SYNONYMS_HIDDEN_COOKIE, true)
    }
  }
  const toggleRuler = () => {
    if (rulerVisible && document.activeElement?.closest('[data-editor-ruler]')) editor?.focus()
    setRulerVisible(!rulerVisible)
    setPreferenceCookie(RULER_HIDDEN_COOKIE, rulerVisible)
  }
  return (
    <ViewContext
      value={{
        rulerVisible,
        toggleRuler,
        synonymsVisible,
        synonymsOver: !room && over,
        setRoom,
        showSynonyms,
        hideSynonyms,
        toggleSynonyms: synonymsVisible ? hideSynonyms : showSynonyms,
      }}
    >
      {children}
    </ViewContext>
  )
}
export function useEditorView() {
  const view = use(ViewContext)
  if (!view) throw new Error('useEditorView must be used inside <EditorViewProvider>')
  return view
}
