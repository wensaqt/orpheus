'use client'

import { useT } from '@front/_components/i18n/I18nProvider'
import { IconButton } from '@front/_components/ui/IconButton/IconButton'

import styles from './BinderPanel.module.css'
import { ChevronIcon, NewDocumentIcon, NewFolderIcon } from '../icons'
import { useBinder } from './state/BinderProvider'
import { BinderTree } from './tree/BinderTree'

type BinderPanelProps = {
  onHide: () => void
}

// Left column of the editor: a small toolbar, then the binder (the titles are in the header)
export function BinderPanel({ onHide }: BinderPanelProps) {
  const t = useT()
  const { commands } = useBinder()

  return (
    <nav className={styles.panel} aria-label={t('binder.label')}>
      <div className={styles.toolbar} role="toolbar" aria-label={t('binder.toolbar')}>
        <IconButton
          label={t('binder.newDocument')}
          icon={<NewDocumentIcon />}
          onClick={() => void commands.create('document', null)}
        />
        <IconButton
          label={t('binder.newFolder')}
          icon={<NewFolderIcon />}
          onClick={() => void commands.create('folder', null)}
        />
        <IconButton
          label={t('binder.hide')}
          icon={<ChevronIcon />}
          className={styles.hide}
          onClick={onHide}
        />
      </div>
      {/* The tree's own name: the column around it is the binder's navigation */}
      <BinderTree label={t('binder.treeLabel')} />
    </nav>
  )
}
