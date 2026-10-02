'use client'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { type ComponentProps, useRef } from 'react'

import { TitleNavigationPlugin } from '@front/_components/editor/plugins/TitleNavigationPlugin'
import { useT } from '@front/_components/i18n/I18nProvider'
import { TitleInput } from '@front/_components/ui/TitleInput/TitleInput'

import styles from './DocumentEditor.module.css'

/*
 * The document's title above the sheet, read with the text as one page: Enter goes down to
 * the start of the text, the up arrow at the start of the text comes back.
 */
export function DocumentTitle(field: ComponentProps<typeof TitleInput>) {
  const t = useT()
  const [editor] = useLexicalComposerContext()
  const input = useRef<HTMLInputElement>(null)

  return (
    <>
      <TitleInput
        ref={input}
        className={styles.title}
        aria-label={t('editor.documentTitleLabel')}
        {...field}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return
          e.preventDefault()
          // Where the caret was, or else the start of the text
          editor.focus(undefined, { defaultSelection: 'rootStart' })
        }}
      />
      <TitleNavigationPlugin title={input} />
    </>
  )
}
