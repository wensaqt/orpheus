import { type ChangeEvent, useLayoutEffect, useRef, useState } from 'react'

import { cleanTitle } from '@/lib/titles'

import type { ActionResult } from '@front/_lib/actionResult'

import { useAutosave } from './useAutosave'

type TitleFieldOptions = {
  title: string
  maxLength: number
  save: (title: string) => Promise<ActionResult<unknown>>
  // Each storable title as it is typed (e.g. to show it elsewhere at once)
  onTitle?: (title: string, previous: string, group: object) => void
  resetVersion?: number
}

/*
 * A title edited in place and saved as it is typed. Only storable titles are saved (trimmed,
 * not empty); leaving the field empty brings back the last storable one, which is the one saved.
 */
export function useTitleField({
  title,
  maxLength,
  save,
  onTitle,
  resetVersion = 0,
}: TitleFieldOptions) {
  const [value, setValue] = useState(title)
  const [previousTitle, setPreviousTitle] = useState(title)
  if (previousTitle !== title) {
    setPreviousTitle(title)
    if (cleanTitle(value, maxLength) !== title) setValue(title)
  }
  const [version, setVersion] = useState(resetVersion)
  if (version !== resetVersion) {
    setVersion(resetVersion)
    setValue(title)
  }
  const group = useRef<object>({})
  const latest = useRef(title)
  useLayoutEffect(() => {
    latest.current = title
  }, [title, resetVersion])
  const { status, failure, queue, flush, cancel, retryAfterLogin } = useAutosave(() =>
    save(latest.current),
  )

  return {
    status,
    failure,
    flush,
    cancel,
    retryAfterLogin,
    inputProps: {
      value,
      maxLength,
      onChange: (e: ChangeEvent<HTMLInputElement>) => {
        setValue(e.target.value)
        const cleaned = cleanTitle(e.target.value, maxLength)
        if (!cleaned) return
        const previous = latest.current
        latest.current = cleaned
        onTitle?.(cleaned, previous, group.current)
        queue()
      },
      onBlur: () => {
        group.current = {}
        if (!cleanTitle(value, maxLength)) setValue(latest.current)
        void flush()
      },
    },
  }
}
