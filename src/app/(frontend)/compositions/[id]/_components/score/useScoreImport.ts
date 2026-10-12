import { useEffect, useRef, useState, type ChangeEvent } from 'react'

import { validateScoreImport, MAX_SCORE_BYTES } from '@/lib/scores/validation'
import { verifyScoreRender } from '@front/_components/scores/scoreRenderValidation'
import { ScoreError } from '@/lib/scores/errors'
import { useT } from '@front/_components/i18n/I18nProvider'
import { scoreErrorMessage } from '@front/_components/scores/scoreErrorMessage'

export function useScoreImport({
  getWidth,
  onImport,
  onError,
}: {
  getWidth: () => number
  onImport: (xml: string) => void
  onError: (message: string) => void
}) {
  const t = useT()
  const inputRef = useRef<HTMLInputElement>(null)
  const generation = useRef(0)
  const importInProgress = useRef(false)
  const [isImporting, setIsImporting] = useState(false)
  const callbacks = useRef({ onImport, onError })
  useEffect(() => {
    callbacks.current = { onImport, onError }
  }, [onImport, onError])
  useEffect(
    () => () => {
      generation.current++
    },
    [],
  )

  async function importFile(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return
    const request = ++generation.current
    importInProgress.current = true
    setIsImporting(true)
    try {
      if (!/\.(musicxml|xml)$/i.test(file.name)) throw new ScoreError('compressedFile')
      if (file.size > MAX_SCORE_BYTES)
        throw new ScoreError('fileTooLarge', { size: MAX_SCORE_BYTES / 1_000_000 })
      const xml = await file.text()
      if (request !== generation.current) return
      validateScoreImport(xml)
      await verifyScoreRender(xml, getWidth())
      if (request === generation.current) callbacks.current.onImport(xml)
    } catch (cause) {
      if (request === generation.current)
        callbacks.current.onError(scoreErrorMessage(cause, t, 'importFailed'))
    } finally {
      if (request === generation.current) {
        importInProgress.current = false
        setIsImporting(false)
        input.value = ''
      }
    }
  }
  return { inputRef, importFile, isImporting, importInProgress }
}
