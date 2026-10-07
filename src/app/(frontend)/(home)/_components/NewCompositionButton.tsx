'use client'

import { useFormStatus } from 'react-dom'

import { OpeningDesk } from '@front/_components/editor/OpeningDesk'
import { preloadEditor } from '@front/_components/editor/preloadEditor'

import { LyreButton } from './LyreButton/LyreButton'
import { LyreSide } from './LyreButton/types'

type NewCompositionButtonProps = {
  text: string
  subtitle: string
  className?: string
}

/*
 * The home's "new composition" choice, inside the form that creates it. Pointing at it loads
 * the editor's code ahead; once pressed, the desk shows until the new editor is there.
 */
export function NewCompositionButton({ text, subtitle, className }: NewCompositionButtonProps) {
  const { pending } = useFormStatus()
  return (
    <>
      <LyreButton
        type="submit"
        className={className}
        side={LyreSide.Left}
        text={text}
        subtitle={subtitle}
        disabled={pending}
        aria-busy={pending}
        onPointerEnter={preloadEditor}
        onFocus={preloadEditor}
      />
      {pending && <OpeningDesk />}
    </>
  )
}
