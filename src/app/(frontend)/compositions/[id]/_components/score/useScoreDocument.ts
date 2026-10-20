import { type KeyboardEvent, useCallback, useMemo, useRef, useState } from 'react'
import { IS_APPLE } from 'lexical'

import { contentRevision } from '@/lib/contentRevision'
import { MAX_BINDER_TITLE_LENGTH } from '@/lib/binder/constants'
import type { Id } from '@/lib/ids'
import {
  correctPitch,
  hasInstrumentTranspose,
  inspectScore,
  type Pitch,
  type ScoreNote,
} from '@/lib/scores'
import type { ScoreVariant } from '@/lib/scores/variantTitle'
import { renameBinderItem, saveScoreDocument } from '@front/_features/binder/actions'
import { documentCacheGeneration, rememberScore } from '@front/_features/binder/documentStore'
import { SaveStatus } from '@front/_hooks/types'
import { useAutosave } from '@front/_hooks/useAutosave'
import { useTitleField } from '@front/_hooks/useTitleField'
import { useT } from '@front/_components/i18n/I18nProvider'
import { scoreErrorMessage } from '@front/_components/scores/scoreErrorMessage'
import type { Translate } from '@front/_lib/i18n'

import { useBinder, useRegisterSaver } from '../binder/state/BinderProvider'
import { SAVERS } from '../binder/state/saverKeys'
import { useHistoryState } from '../history/HistoryProvider'
import { useRegisterScoreCommands, type ScoreCommands } from './ScoreCommands'
import { useScoreImport } from './useScoreImport'
import { useScoreTransposition } from './useScoreTransposition'
import { useScoreXml } from './useScoreXml'
import { useScoreMeasures } from './useScoreMeasures'
import { useScorePanel } from './useScorePanel'
import { isModShortcut, isModShiftShortcut } from '@front/_components/ui/shortcuts'

type ScoreDocumentOptions = { id: Id; title: string; initialXml: string }

// A score may render while containing structures the pitch correction tools cannot edit.
function inspectCorrectableNotes(
  xml: string,
  t: Translate,
): { notes: ScoreNote[]; issue: string | null } {
  try {
    return { notes: inspectScore(xml), issue: null }
  } catch (cause) {
    return {
      notes: [],
      issue: scoreErrorMessage(cause, t, 'correctionFailed'),
    }
  }
}

function downloadXml(xml: string, title: string) {
  const url = URL.createObjectURL(
    new Blob([xml], { type: 'application/vnd.recordare.musicxml+xml' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = `${title.trim() || 'partition'}.musicxml`
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function useScoreTitle(id: Id, title: string) {
  const { commands } = useBinder()
  const { generation, busy } = useHistoryState()
  const field = useTitleField({
    resetVersion: generation,
    title,
    maxLength: MAX_BINDER_TITLE_LENGTH,
    save: (next) => renameBinderItem(id, next),
    onTitle: (next, previous, group) => commands.setTitle(id, next, previous, group),
  })
  useRegisterSaver(SAVERS.documentTitle(id), field)
  return { field, busy }
}

export function useScoreDocument({ id, title, initialXml }: ScoreDocumentOptions) {
  const t = useT()
  const cacheGeneration = useRef(documentCacheGeneration()).current
  const { commands: binderCommands } = useBinder()
  const revision = useRef<Promise<string> | null>(null)
  const content = useScoreXml(initialXml)
  const [error, setError] = useState<string | null>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const transposition = useScoreTransposition(content.xml, createVariant, setError)
  const { preview, reset: resetPreview } = transposition
  const {
    panel,
    selectedNote,
    setSelectedNote,
    selectedMeasure,
    setSelectedMeasure,
    selectMeasure,
    openPanel,
    selectNote,
    closePanel,
  } = useScorePanel({ resetPreview, onError: setError })
  const {
    inputRef: fileInput,
    importFile,
    isImporting,
    importInProgress,
  } = useScoreImport({
    getWidth: () => {
      const sheet = sheetRef.current
      if (!sheet) return 0
      const style = getComputedStyle(sheet)
      return sheet.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
    },
    onImport: acceptImport,
    onError: setError,
  })
  const save = useAutosave(persistCurrentXml)
  const queueSave = save.queue
  useRegisterSaver(SAVERS.documentText(id), save)
  const { field: titleField, busy } = useScoreTitle(id, title)
  // Panels start closed, so DOM inspection runs only after a client interaction.
  const inspection = useMemo(
    () =>
      panel === 'correct' ? inspectCorrectableNotes(content.xml, t) : { notes: [], issue: null },
    [content.xml, panel, t],
  )
  const measures = useScoreMeasures({
    content,
    selection: { index: selectedMeasure, select: setSelectedMeasure },
    enabled: panel === 'measures' || selectedMeasure !== null,
    importInProgress,
    onChange: (next) => {
      changeXml(next)
      setSelectedNote(null)
    },
    onError: setError,
  })
  const sourceDeclared = useMemo(
    () => panel === 'transpose' && hasInstrumentTranspose(content.xml),
    [content.xml, panel],
  )

  async function createVariant(next: string, variant: ScoreVariant): Promise<boolean> {
    if (importInProgress.current) return false
    return (await binderCommands.createScoreTransposition(id, next, variant)) !== null
  }
  async function persistCurrentXml() {
    const sentXml = content.xmlRef.current
    const result = await saveScoreDocument({
      id,
      scoreXml: sentXml,
      expectedRevision: await (revision.current ??= contentRevision(initialXml)),
    })
    if (result.status === 'done') {
      revision.current = Promise.resolve(result.data.revision)
      rememberScore(id, { scoreXml: sentXml, updatedAt: result.data.updatedAt }, cacheGeneration)
    }
    return result
  }
  function changeXml(next: string) {
    const changed = content.commitXml(next)
    resetPreview()
    setError(null)
    if (changed) queueSave()
  }
  function acceptImport(next: string) {
    changeXml(next)
    transposition.resetSource()
    closePanel()
    setSelectedMeasure(null)
  }
  function correctNote(index: number, pitch: Pitch) {
    if (importInProgress.current) return
    try {
      changeXml(correctPitch(content.xmlRef.current, index, pitch))
    } catch (cause) {
      setError(scoreErrorMessage(cause, t, 'correctionFailed'))
    }
  }
  function correctSelectedNote(index: number, pitch: Pitch) {
    setSelectedNote(index)
    correctNote(index, pitch)
  }
  const restorePreviousXml = content.restorePreviousXml
  // These callbacks feed the command registration effect. Keep their identities
  // stable until their actual inputs change, to avoid re-registering on panel/error changes.
  const undoXml = useCallback(() => {
    if (importInProgress.current) return
    if (!restorePreviousXml()) return
    setSelectedMeasure(null)
    setSelectedNote(null)
    resetPreview()
    queueSave()
  }, [
    restorePreviousXml,
    resetPreview,
    queueSave,
    importInProgress,
    setSelectedMeasure,
    setSelectedNote,
  ])
  const restoreNextXml = content.restoreNextXml
  const redoXml = useCallback(() => {
    if (importInProgress.current) return
    if (!restoreNextXml()) return
    setSelectedMeasure(null)
    setSelectedNote(null)
    resetPreview()
    queueSave()
  }, [
    restoreNextXml,
    resetPreview,
    queueSave,
    importInProgress,
    setSelectedMeasure,
    setSelectedNote,
  ])
  const actions: ScoreCommands = useMemo(
    () => ({
      openImport: () => fileInput.current?.click(),
      setPanel: openPanel,
      undo: undoXml,
      canUndo: content.canUndo && !isImporting,
      redo: redoXml,
      canRedo: content.canRedo && !isImporting,
      download: () => downloadXml(content.xml, title),
      print: () => window.print(),
    }),
    [
      fileInput,
      openPanel,
      undoXml,
      redoXml,
      content.canUndo,
      content.canRedo,
      content.xml,
      title,
      isImporting,
    ],
  )
  useRegisterScoreCommands(actions)

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && (panel || selectedMeasure !== null)) {
      closePanel()
      setSelectedMeasure(null)
      return
    }
    const redo = isModShiftShortcut(event, 'z') || (!IS_APPLE && isModShortcut(event, 'y'))
    if (!redo && !isModShortcut(event, 'z')) return
    if (
      event.target instanceof HTMLElement &&
      event.target.closest('input, textarea, select, [contenteditable=true]')
    )
      return
    event.preventDefault()
    if (redo) redoXml()
    else undoXml()
  }
  return {
    sheetRef,
    fileInput,
    importFile,
    isImporting,
    onKeyDown,
    titleField,
    busy,
    error,
    hasSaveError: titleField.status === SaveStatus.Error || save.status === SaveStatus.Error,
    saveRecovery: {
      reason: save.failure ?? titleField.failure,
      onDownload: actions.download,
      onRetry: async () => {
        await Promise.all([save.retryAfterLogin(), titleField.retryAfterLogin()])
      },
      onDiscard: () => {
        save.cancel()
        titleField.cancel()
        window.location.reload()
      },
    },
    panelProps: {
      panel,
      onClose: closePanel,
      disabled: isImporting,
      measures: {
        measures: measures.measures,
        issue: measures.issue,
        selectedIndex: selectedMeasure,
        onSelect: setSelectedMeasure,
        onEdit: measures.edit,
      },
      correction: {
        notes:
          selectedMeasure === null
            ? inspection.notes
            : inspection.notes.filter((note) => note.measureIndex === selectedMeasure),
        issue: inspection.issue,
        selectedIndex: selectedNote,
        showAll: selectedNote !== null || selectedMeasure !== null,
        onShowAll: () => {
          setSelectedNote(null)
          setSelectedMeasure(null)
        },
        onEdit: correctSelectedNote,
      },
      transposition: {
        ...transposition.controls,
        availability: {
          sourceDeclared,
          hasPreview: preview !== null,
          canApply: transposition.canApply,
          applying: transposition.applying,
        },
      },
    },
    measureActions:
      measures.active && preview === null && panel === null
        ? {
            measure: measures.active,
            canDelete: measures.measures.length > 1,
            disabled: isImporting,
            onEdit: measures.edit,
            onCorrect: () => openPanel('correct'),
            onClose: () => selectMeasure(null),
          }
        : null,
    rendererProps: {
      xml: preview ?? content.xml,
      onRenderState: transposition.onRenderState,
      selectedMeasure: preview === null && !isImporting ? selectedMeasure : null,
      onMeasureClick: preview === null && !isImporting ? selectMeasure : undefined,
      onNoteClick: preview === null && !isImporting ? selectNote : undefined,
    },
  }
}
