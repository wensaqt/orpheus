'use client'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { type ComponentProps, type KeyboardEvent, useRef } from 'react'

import { TitleNavigationPlugin } from '@front/_components/editor/plugins/TitleNavigationPlugin'
import { useT } from '@front/_components/i18n/I18nProvider'
import { TitleInput } from '@front/_components/ui/TitleInput/TitleInput'

/*
 * The document's title, in the editor's header, read with the text as one page: Enter goes
 * down to the text, the up arrow at the start of the text comes back.
 */
export function DocumentTitle(field: ComponentProps<typeof TitleInput>) {
  const t = useT()
  const [editor] = useLexicalComposerContext()
  const input = useRef<HTMLInputElement>(null)

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    // Where the caret was, or else the start of the text
    editor.focus(undefined, { defaultSelection: 'rootStart' })
  }

  return (
    <>
      <TitleInput
        ref={input}
        size="lg"
        aria-label={t('editor.documentTitleLabel')}
        {...field}
        onKeyDown={handleKeyDown}
      />
      <TitleNavigationPlugin title={input} />
    </>
  )
}
