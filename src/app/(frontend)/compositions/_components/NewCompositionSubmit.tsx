'use client'

import type { ReactNode } from 'react'
import { useFormStatus } from 'react-dom'

import { OpeningDesk } from '@front/_components/editor/OpeningDesk'
import { preloadEditor } from '@front/_components/editor/preloadEditor'

/*
 * The submit button of the "new composition" card. Pointing at it loads the editor's code
 * ahead; once pressed, the desk shows until the new editor is there.
 */
export function NewCompositionSubmit({
  className,
  children,
}: {
  className: string
  children: ReactNode
}) {
  const { pending } = useFormStatus()
  return (
    <>
      <button
        type="submit"
        className={className}
        disabled={pending}
        aria-busy={pending}
        onPointerEnter={preloadEditor}
        onFocus={preloadEditor}
      >
        {children}
      </button>
      {pending && <OpeningDesk />}
    </>
  )
}
