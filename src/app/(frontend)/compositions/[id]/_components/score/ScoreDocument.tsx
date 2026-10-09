'use client'

import {
  type ChangeEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'

import { MAX_BINDER_TITLE_LENGTH } from '@/lib/binder/constants'
import type { Id } from '@/lib/ids'
import {
  adaptToInstrument,
  correctPitch,
  hasInstrumentTranspose,
  inspectScore,
  INTERVALS,
  transposeKey,
  type Instrument,
  type Pitch,
  validateScoreImport,
} from '@/lib/scores/prototype'

import { ScorePreview, verifyScoreRender } from '@front/_components/scores/ScorePreview'
import { Heading } from '@front/_components/ui/Heading/Heading'
import { IconButton } from '@front/_components/ui/IconButton/IconButton'
import { TitleInput } from '@front/_components/ui/TitleInput/TitleInput'
import { renameBinderItem, saveScoreDocument } from '@front/_features/binder/actions'
import { fetchDocument } from '@front/_features/binder/fetchDocument'
import type { EditorDocument } from '@front/_features/binder/types'
import { SaveStatus } from '@front/_hooks/types'
import { useAutosave } from '@front/_hooks/useAutosave'
import { useTitleField } from '@front/_hooks/useTitleField'
import { useT } from '@front/_components/i18n/I18nProvider'

import { useBinder, useRegisterSaver } from '../binder/state/BinderProvider'
import { SAVERS } from '../binder/state/saverKeys'
import { useDocumentTitleSlot } from '../header/documentTitleSlot'
import { useHistoryState } from '../history/HistoryProvider'
import { useRegisterScoreCommands, type ScoreCommands, type ScorePanel } from './ScoreCommands'
import { PitchCorrectionControls, TranspositionControls } from './ScoreControls'
import styles from './ScoreDocument.module.css'

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

export function ScoreDocumentLoader({ id, initial }: { id: Id; initial?: EditorDocument }) {
  const { compositionId, entries } = useBinder()
  const [document, setDocument] = useState(initial)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (initial) return
    let current = true
    void fetchDocument(compositionId, id)
      .then((loaded) => {
        if (current) {
          if (loaded?.documentType === 'score') setDocument(loaded)
          else setError(true)
        }
      })
      .catch(() => {
        if (current) setError(true)
      })
    return () => {
      current = false
    }
  }, [compositionId, id, initial])

  const entry = entries.find((item) => item.id === id && item.documentType === 'score')
  if (!entry || error) return <p className={styles.message}>Impossible d’ouvrir cette partition.</p>
  if (!document)
    return (
      <p className={styles.message} aria-busy="true">
        Ouverture de la partition…
      </p>
    )
  return <ScoreDocument id={id} title={entry.title} initialXml={document.scoreXml ?? ''} />
}

function ScoreDocument({ id, title, initialXml }: { id: Id; title: string; initialXml: string }) {
  const t = useT()
  const { commands: binderCommands } = useBinder()
  const titleSlot = useDocumentTitleSlot()
  const { generation, busy } = useHistoryState()
  const [xml, setXml] = useState(initialXml)
  const xmlRef = useRef(xml)
  const [history, setHistory] = useState<string[]>([])
  const [panel, setPanel] = useState<ScorePanel>(null)
  const [selectedNote, setSelectedNote] = useState<number | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)
  const [intervalIndex, setIntervalIndex] = useState(1)
  const [mode, setMode] = useState<'key' | 'instrument'>('key')
  const [instrument, setInstrument] = useState<Instrument>('trumpet-bb')
  const [sourceInstrument, setSourceInstrument] = useState<Instrument | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const save = useAutosave(() => saveScoreDocument(id, xmlRef.current))
  const queueSave = save.queue
  useRegisterSaver(SAVERS.documentText(id), save)
  const titleField = useTitleField({
    resetVersion: generation,
    title,
    maxLength: MAX_BINDER_TITLE_LENGTH,
    save: (next) => renameBinderItem(id, next),
    onTitle: (next, previous, group) => binderCommands.setTitle(id, next, previous, group),
  })
  useRegisterSaver(SAVERS.documentTitle(id), titleField)

  const inspection = useMemo(() => {
    try {
      return { notes: inspectScore(xml), issue: null }
    } catch (cause) {
      return {
        notes: [],
        issue:
          cause instanceof Error ? cause.message : 'Correction impossible pour cette partition.',
      }
    }
  }, [xml])
  const sourceDeclared = useMemo(() => hasInstrumentTranspose(xml), [xml])

  function change(next: string) {
    setHistory((previous) => [...previous, xml])
    xmlRef.current = next
    setXml(next)
    setPreview(null)
    setError(null)
    queueSave()
  }

  const undo = useCallback(() => {
    const previous = history.at(-1)
    if (previous === undefined) return
    xmlRef.current = previous
    setXml(previous)
    setHistory(history.slice(0, -1))
    setPreview(null)
    queueSave()
  }, [history, queueSave])

  const actions: ScoreCommands = useMemo(
    () => ({
      openImport: () => fileInput.current?.click(),
      setPanel: (next) => {
        setPanel(next)
        setSelectedNote(null)
        setPreview(null)
        setError(null)
      },
      undo,
      canUndo: history.length > 0,
      download: () => downloadXml(xml, title),
      print: () => window.print(),
    }),
    [undo, history.length, xml, title],
  )
  useRegisterScoreCommands(actions)

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      if (!/\.(musicxml|xml)$/i.test(file.name))
        throw new Error('Choisissez un fichier MusicXML non compressé.')
      if (file.size > 2_000_000) throw new Error('Le fichier dépasse 2 Mo.')
      const next = await file.text()
      validateScoreImport(next)
      await verifyScoreRender(next)
      change(next)
      setSourceInstrument(null)
      setPanel(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Import impossible.')
    } finally {
      event.target.value = ''
    }
  }

  function editNote(index: number, pitch: Pitch) {
    try {
      change(correctPitch(xml, index, pitch))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Correction impossible.')
    }
  }

  function makePreview() {
    try {
      const next =
        mode === 'key'
          ? transposeKey(xml, INTERVALS[intervalIndex])
          : adaptToInstrument(xml, instrument, sourceInstrument)
      setPreview(next)
      setError(null)
    } catch (cause) {
      setPreview(null)
      setError(cause instanceof Error ? cause.message : 'Transposition impossible.')
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && panel) {
      setPanel(null)
      setSelectedNote(null)
      setPreview(null)
      return
    }
    if (event.key.toLowerCase() !== 'z' || !(event.metaKey || event.ctrlKey) || event.shiftKey)
      return
    event.preventDefault()
    undo()
  }

  return (
    <div className={styles.workspace} onKeyDown={onKeyDown}>
      {titleSlot &&
        createPortal(
          <TitleInput
            size="lg"
            aria-label={t('editor.documentTitleLabel')}
            disabled={busy}
            {...titleField.inputProps}
          />,
          titleSlot,
        )}
      <input
        ref={fileInput}
        className="visually-hidden"
        type="file"
        aria-label={t('score.importMusicXml')}
        accept=".musicxml,.xml"
        onChange={(event) => void importFile(event)}
      />
      {titleField.status === SaveStatus.Error || save.status === SaveStatus.Error ? (
        <p role="alert" className={styles.error}>
          {t('editor.saveError')}
        </p>
      ) : null}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {panel && (
        <section
          className={styles.panel}
          aria-label={panel === 'correct' ? t('score.correctPitch') : t('score.transpose')}
        >
          <div className={styles.panelHead}>
            <Heading level={2} variant="panel">
              {panel === 'correct' ? t('score.correctPitch') : t('score.transpose')}
            </Heading>
            <IconButton
              label={t('score.closePanel')}
              tooltipAlign="end"
              icon={<span aria-hidden="true">×</span>}
              onClick={() => {
                setPanel(null)
                setSelectedNote(null)
                setPreview(null)
              }}
            />
          </div>
          {panel === 'correct' ? (
            <PitchCorrectionControls
              notes={inspection.notes}
              issue={inspection.issue}
              selectedIndex={selectedNote}
              onShowAll={() => setSelectedNote(null)}
              onEdit={(index, pitch) => {
                setSelectedNote(index)
                editNote(index, pitch)
              }}
            />
          ) : (
            <TranspositionControls
              mode={mode}
              intervalIndex={intervalIndex}
              instrument={instrument}
              sourceInstrument={sourceInstrument}
              sourceDeclared={sourceDeclared}
              hasPreview={preview !== null}
              applying={applying}
              onModeChange={(next) => {
                setMode(next)
                setPreview(null)
              }}
              onIntervalChange={(next) => {
                setIntervalIndex(next)
                setPreview(null)
              }}
              onInstrumentChange={(next) => {
                setInstrument(next)
                setPreview(null)
              }}
              onSourceInstrumentChange={(next) => {
                setSourceInstrument(next)
                setPreview(null)
              }}
              onPreview={makePreview}
              onApply={() => {
                if (preview === null || applying) return
                setApplying(true)
                void binderCommands
                  .createScoreTransposition(
                    id,
                    preview,
                    mode === 'key' ? { mode, intervalIndex } : { mode, instrument },
                  )
                  .finally(() => setApplying(false))
              }}
            />
          )}
        </section>
      )}
      <div className={styles.sheet}>
        <ScorePreview
          xml={preview ?? xml}
          className={styles.score}
          onNoteClick={
            preview === null
              ? (index) => {
                  setSelectedNote(index)
                  setPanel('correct')
                  setError(null)
                }
              : undefined
          }
        />
      </div>
    </div>
  )
}
