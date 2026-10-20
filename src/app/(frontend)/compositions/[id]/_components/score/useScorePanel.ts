import { useCallback, useState } from 'react'
import type { ScorePanel } from './ScoreCommands'

/** Keep panel navigation and note selection local to this mounted score document. */
export function useScorePanel({
  resetPreview,
  onError,
}: {
  resetPreview: () => void
  onError: (message: string | null) => void
}) {
  const [panel, setPanel] = useState<ScorePanel>(null)
  const [selectedMeasure, setSelectedMeasure] = useState<number | null>(null)
  const [selectedNote, setSelectedNote] = useState<number | null>(null)
  // Registered as a document command: selection changes must not re-register the menu actions.
  const openPanel = useCallback(
    (next: ScorePanel) => {
      setPanel(next)
      if (next === 'measures') setSelectedMeasure((current) => current ?? 0)
      setSelectedNote(null)
      resetPreview()
      onError(null)
    },
    [resetPreview, onError],
  )

  function selectNote(index: number) {
    setSelectedNote(index)
    setPanel('correct')
    onError(null)
  }

  function closePanel() {
    setPanel(null)
    setSelectedNote(null)
    resetPreview()
  }

  function selectMeasure(index: number | null) {
    closePanel()
    setSelectedMeasure(index)
    onError(null)
  }

  return {
    panel,
    selectedNote,
    setSelectedNote,
    selectedMeasure,
    setSelectedMeasure,
    selectMeasure,
    openPanel,
    selectNote,
    closePanel,
  }
}
