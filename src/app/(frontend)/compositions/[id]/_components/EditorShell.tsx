'use client'

import { type ReactNode, useState } from 'react'

import type { PageSettings } from '@/lib/pageFormats'
import type { Id } from '@/lib/ids'

import { useT } from '@front/_components/i18n/I18nProvider'
import { IconButton } from '@front/_components/ui/IconButton/IconButton'
import type { BinderEntry } from '@front/_features/binder/types'
import { BINDER_HIDDEN_COOKIE, setPreferenceCookie } from '@front/_lib/preferences'

import { BinderPanel } from './binder/BinderPanel'
import { BinderIcon } from './binder/icons'
import { BinderProvider } from './binder/state/BinderProvider'
import styles from './EditorShell.module.css'
import { SynonymsPanel } from './SynonymsPanel'

type EditorShellProps = {
  compositionId: Id
  title: string
  page: PageSettings
  entries: BinderEntry[]
  // Remembered in a cookie, so the page renders with the binder as the writer left it
  binderHidden: boolean
  // The open document (or the empty binder's invitation)
  children: ReactNode
}

/*
 * The "desk": the sheet stays centred in the middle column, the binder takes the left one and
 * the synonyms the right one.
 */
export function EditorShell({
  compositionId,
  title,
  page,
  entries,
  binderHidden,
  children,
}: EditorShellProps) {
  const t = useT()
  const [hidden, setHidden] = useState(binderHidden)
  const toggle = (next: boolean) => {
    setHidden(next)
    setPreferenceCookie(BINDER_HIDDEN_COOKIE, next)
  }

  return (
    <BinderProvider compositionId={compositionId} page={page} entries={entries}>
      <div className={styles.screen}>
        <div className={styles.desk}>
          <div className={styles.binder}>
            {hidden ? (
              <IconButton
                label={t('binder.show')}
                icon={<BinderIcon />}
                className={styles.show}
                onClick={() => toggle(false)}
              />
            ) : (
              <BinderPanel title={title} onHide={() => toggle(true)} />
            )}
          </div>
          <div className={styles.column}>{children}</div>
          <div className={styles.aside}>
            <SynonymsPanel />
          </div>
        </div>
      </div>
    </BinderProvider>
  )
}
