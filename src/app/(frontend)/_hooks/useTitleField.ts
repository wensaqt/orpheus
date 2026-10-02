import { type ChangeEvent, useRef, useState } from 'react'

import { cleanTitle } from '@/lib/titles'

import type { ActionResult } from '@front/_lib/actionResult'

import { useAutosave } from './useAutosave'

type TitleFieldOptions = {
  title: string
  maxLength: number
  save: (title: string) => Promise<ActionResult<unknown>>
  // Each storable title as it is typed (e.g. to show it elsewhere at once)
  onTitle?: (title: string) => void
}

/*
 * A title edited in place and saved as it is typed. Only storable titles are saved (trimmed,
 * not empty); leaving the field empty brings back the last storable one, which is the one saved.
 */
export function useTitleField({ title, maxLength, save, onTitle }: TitleFieldOptions) {
  const [value, setValue] = useState(title)
  const latest = useRef(title)
  const { status, queue, flush, cancel } = useAutosave(() => save(latest.current))

  return {
    status,
    flush,
    cancel,
    inputProps: {
      value,
      maxLength,
      onChange: (e: ChangeEvent<HTMLInputElement>) => {
        setValue(e.target.value)
        const cleaned = cleanTitle(e.target.value, maxLength)
        if (!cleaned) return
        latest.current = cleaned
        onTitle?.(cleaned)
        queue()
      },
      onBlur: () => {
        if (!cleanTitle(value, maxLength)) setValue(latest.current)
        void flush()
      },
    },
  }
}
