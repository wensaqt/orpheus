import { useCallback, useEffect, useRef, useState } from 'react'

export type SaveStatus = 'saved' | 'pending' | 'saving' | 'error'

// Délai d'inactivité avant d'enregistrer
const AUTOSAVE_DELAY = 800

/*
 * Regroupe les modifications et les enregistre après un temps d'inactivité. Les envois sont
 * chaînés pour garder leur ordre ; en cas d'échec, les modifications sont remises en attente.
 */
export function useAutosave<Patch extends object>(save: (patch: Patch) => Promise<unknown>) {
  const [status, setStatus] = useState<SaveStatus>('saved')
  const pending = useRef<Partial<Patch>>({})
  const timer = useRef<number | null>(null)
  const chain = useRef<Promise<void>>(Promise.resolve())

  const flush = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = null
    chain.current = chain.current.then(async () => {
      const patch = pending.current
      if (!Object.keys(patch).length) return
      pending.current = {}
      setStatus('saving')
      try {
        await save(patch as Patch)
        setStatus(Object.keys(pending.current).length ? 'pending' : 'saved')
      } catch {
        pending.current = { ...patch, ...pending.current }
        setStatus('error')
      }
    })
    return chain.current
  }, [save])

  const queue = useCallback(
    (patch: Partial<Patch>) => {
      pending.current = { ...pending.current, ...patch }
      setStatus('pending')
      if (timer.current) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(flush, AUTOSAVE_DELAY)
    },
    [flush],
  )

  // Prévient avant de quitter la page avec des modifications non enregistrées
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (Object.keys(pending.current).length) e.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => {
      window.removeEventListener('beforeunload', warn)
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [])

  return { status, queue, flush }
}
